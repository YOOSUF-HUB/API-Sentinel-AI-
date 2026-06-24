"""Parse OpenAPI / Swagger specs (JSON or YAML) into structured chunks.

The goal is to produce semantically coherent text blocks that an embedder can
turn into vectors: one block per endpoint operation, one per named schema, plus
blocks for the global security/auth definitions and the top-level info. Endpoint
definitions are kept whole so retrieval never returns half an operation.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

import yaml

from models.schemas import Chunk

HTTP_METHODS = {"get", "post", "put", "patch", "delete", "head", "options", "trace"}


def looks_like_openapi(raw: str) -> bool:
    """Cheap heuristic so the upload route can pick a parser."""
    head = raw.lstrip()[:4000].lower()
    return ("openapi" in head or "swagger" in head) and "paths" in head


def parse(raw: str, file_name: str) -> List[Chunk]:
    """Parse a raw OpenAPI/Swagger document string into chunks."""
    spec = _load(raw)
    if not isinstance(spec, dict):
        raise ValueError("OpenAPI document did not parse into an object.")

    chunks: List[Chunk] = []
    chunks.extend(_info_chunk(spec))
    chunks.extend(_security_chunks(spec))
    chunks.extend(_endpoint_chunks(spec))
    chunks.extend(_schema_chunks(spec))
    return [c for c in chunks if c.content.strip()]


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------
def _load(raw: str) -> Any:
    """Load JSON or YAML. JSON is a subset of YAML, but try JSON first for speed
    and clearer errors."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        try:
            return yaml.safe_load(raw)
        except yaml.YAMLError as exc:  # pragma: no cover - surfaced to caller
            raise ValueError(f"Could not parse document as JSON or YAML: {exc}")


# ---------------------------------------------------------------------------
# Section builders
# ---------------------------------------------------------------------------
def _info_chunk(spec: Dict[str, Any]) -> List[Chunk]:
    info = spec.get("info", {}) or {}
    version_label = spec.get("openapi") or (
        f"swagger {spec.get('swagger')}" if spec.get("swagger") else "unknown"
    )
    servers = spec.get("servers") or []
    host = spec.get("host")
    schemes = spec.get("schemes") or []
    base_path = spec.get("basePath")

    lines = [
        "API OVERVIEW",
        f"Title: {info.get('title', 'Untitled API')}",
        f"API version: {info.get('version', 'unspecified')}",
        f"Spec format: {version_label}",
    ]
    if info.get("description"):
        lines.append(f"Description: {info['description']}")
    if servers:
        urls = ", ".join(str(s.get("url", "")) for s in servers)
        lines.append(f"Servers: {urls}")
    if host:
        lines.append(f"Host: {host}")
    if base_path:
        lines.append(f"Base path: {base_path}")
    if schemes:
        lines.append(f"Transport schemes: {', '.join(schemes)}")
        if "https" not in [s.lower() for s in schemes]:
            lines.append("Note: HTTPS is not among the declared schemes.")

    return [Chunk(content="\n".join(lines), section_type="info")]


def _security_chunks(spec: Dict[str, Any]) -> List[Chunk]:
    """Global auth definitions + the global security requirement."""
    chunks: List[Chunk] = []

    # OpenAPI 3: components.securitySchemes; Swagger 2: securityDefinitions.
    schemes = (
        (spec.get("components", {}) or {}).get("securitySchemes")
        or spec.get("securityDefinitions")
        or {}
    )
    global_security = spec.get("security")

    if schemes:
        lines = ["AUTHENTICATION / SECURITY SCHEMES"]
        for name, scheme in schemes.items():
            scheme = scheme or {}
            kind = scheme.get("type", "unknown")
            detail = [f"- {name}: type={kind}"]
            for key in ("scheme", "bearerFormat", "in", "name", "flow", "openIdConnectUrl"):
                if scheme.get(key):
                    detail.append(f"{key}={scheme[key]}")
            scopes = scheme.get("scopes")
            if scopes:
                detail.append("scopes=[" + ", ".join(scopes.keys()) + "]")
            lines.append(" ".join(detail))
        chunks.append(Chunk(content="\n".join(lines), section_type="auth"))
    else:
        chunks.append(
            Chunk(
                content=(
                    "AUTHENTICATION / SECURITY SCHEMES\n"
                    "No security schemes are defined in this specification."
                ),
                section_type="auth",
            )
        )

    if global_security is not None:
        applied = _describe_security(global_security)
        chunks.append(
            Chunk(
                content=(
                    "GLOBAL SECURITY REQUIREMENT\n"
                    f"Applied by default to all operations: {applied}"
                ),
                section_type="auth",
            )
        )
    else:
        chunks.append(
            Chunk(
                content=(
                    "GLOBAL SECURITY REQUIREMENT\n"
                    "No global security requirement is declared; operations are "
                    "unauthenticated unless they specify their own security."
                ),
                section_type="auth",
            )
        )
    return chunks


def _endpoint_chunks(spec: Dict[str, Any]) -> List[Chunk]:
    paths = spec.get("paths", {}) or {}
    chunks: List[Chunk] = []

    for path, path_item in paths.items():
        if not isinstance(path_item, dict):
            continue
        shared_params = path_item.get("parameters", []) or []
        for method, op in path_item.items():
            if method.lower() not in HTTP_METHODS or not isinstance(op, dict):
                continue
            chunks.append(_one_operation(path, method.upper(), op, shared_params))
    return chunks


def _one_operation(
    path: str, method: str, op: Dict[str, Any], shared_params: List[Dict[str, Any]]
) -> Chunk:
    lines = [f"ENDPOINT {method} {path}"]
    if op.get("operationId"):
        lines.append(f"operationId: {op['operationId']}")
    if op.get("summary"):
        lines.append(f"Summary: {op['summary']}")
    if op.get("description"):
        lines.append(f"Description: {op['description']}")
    else:
        lines.append("Description: (none provided)")
    if op.get("tags"):
        lines.append(f"Tags: {', '.join(map(str, op['tags']))}")
    if op.get("deprecated"):
        lines.append("DEPRECATED: this operation is marked deprecated.")

    # Parameters (merge path-level + operation-level).
    params = list(shared_params) + list(op.get("parameters", []) or [])
    if params:
        lines.append("Parameters:")
        for p in params:
            p = p or {}
            loc = p.get("in", "?")
            name = p.get("name", "?")
            required = "required" if p.get("required") else "optional"
            ptype = (p.get("schema", {}) or {}).get("type") or p.get("type") or "?"
            desc = p.get("description", "")
            line = f"  - {name} (in={loc}, type={ptype}, {required})"
            if desc:
                line += f": {desc}"
            else:
                line += ": (no description)"
            lines.append(line)
    else:
        lines.append("Parameters: none")

    # Request body (OpenAPI 3).
    body = op.get("requestBody")
    if body:
        content_types = ", ".join((body.get("content", {}) or {}).keys()) or "?"
        req = "required" if body.get("required") else "optional"
        lines.append(f"Request body ({req}), content types: {content_types}")
        if body.get("description"):
            lines.append(f"  Body description: {body['description']}")

    # Security override at the operation level.
    if "security" in op:
        lines.append(f"Operation security: {_describe_security(op['security'])}")

    # Responses.
    responses = op.get("responses", {}) or {}
    if responses:
        lines.append("Responses:")
        for code, resp in responses.items():
            resp = resp or {}
            desc = resp.get("description", "")
            has_schema = bool(
                resp.get("schema")
                or (resp.get("content", {}) or {})
            )
            schema_note = "with schema" if has_schema else "no response schema"
            lines.append(f"  - {code}: {desc or '(no description)'} [{schema_note}]")
    else:
        lines.append("Responses: none documented")

    return Chunk(content="\n".join(lines), section_type="endpoint", endpoint_path=f"{method} {path}")


def _schema_chunks(spec: Dict[str, Any]) -> List[Chunk]:
    """One chunk per named model/definition."""
    schemas = (
        (spec.get("components", {}) or {}).get("schemas")
        or spec.get("definitions")
        or {}
    )
    chunks: List[Chunk] = []
    for name, schema in schemas.items():
        schema = schema or {}
        lines = [f"SCHEMA {name}"]
        if schema.get("description"):
            lines.append(f"Description: {schema['description']}")
        props = schema.get("properties", {}) or {}
        required = set(schema.get("required", []) or [])
        if props:
            lines.append("Properties:")
            for prop, meta in props.items():
                meta = meta or {}
                ptype = meta.get("type") or _ref_name(meta) or "?"
                req = "required" if prop in required else "optional"
                fmt = f", format={meta['format']}" if meta.get("format") else ""
                line = f"  - {prop} ({ptype}{fmt}, {req})"
                if meta.get("description"):
                    line += f": {meta['description']}"
                lines.append(line)
        else:
            lines.append("Properties: none defined")
        chunks.append(Chunk(content="\n".join(lines), section_type="schema", endpoint_path=name))
    return chunks


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _describe_security(security: Any) -> str:
    if not security:
        return "none (public / unauthenticated)"
    parts: List[str] = []
    for requirement in security:
        if not requirement:
            parts.append("optional (empty requirement = no auth)")
            continue
        for name, scopes in requirement.items():
            if scopes:
                parts.append(f"{name} (scopes: {', '.join(scopes)})")
            else:
                parts.append(name)
    return "; ".join(parts) if parts else "none"


def _ref_name(meta: Dict[str, Any]) -> Optional[str]:
    ref = meta.get("$ref")
    if ref:
        return ref.split("/")[-1]
    items = meta.get("items")
    if isinstance(items, dict) and items.get("$ref"):
        return f"array<{items['$ref'].split('/')[-1]}>"
    return None
