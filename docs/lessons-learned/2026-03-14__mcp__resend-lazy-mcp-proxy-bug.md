# Resend MCP — Arguments Not Passing Through Lazy-MCP Proxy

## Summary
The Resend MCP `send-email` tool fails when invoked through the lazy-mcp proxy. All required arguments (`to`, `subject`, `text`) arrive as `undefined` despite being correctly specified in the tool call.

## Problem
- `mcp__lazy-mcp__execute_tool` with `path: "resend.send-email"` and `arguments: { to: "...", subject: "...", ... }`
- Error: "Invalid arguments" — all fields show `"received": "undefined"`
- This happened consistently across multiple attempts and two separate sessions

## Workaround
- Use Gmail MCP (`gmail_create_draft`) to create a draft, then send manually from Gmail
- Or send directly from Gmail UI

## Root Cause (Suspected)
The lazy-mcp proxy is not unpacking/forwarding the `arguments` object to the underlying Resend MCP tool. The arguments object is being passed but not destructured into individual parameters.

## Status
Unresolved — needs investigation of lazy-mcp proxy argument forwarding logic.

## References
- `~/.claude/` — lazy-mcp configuration
- Resend MCP expects: `to` (string), `subject` (string), `text` (string), optional `html`, `from`, `cc`, `bcc`
