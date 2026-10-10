---
kind: negative
findings:
  - { rule: edge-middleware, file: middleware.js, line: 12 }
manual_items: 1
must_remain:
  - { file: middleware.js, contains: "export function middleware(request) {" }
  - { file: middleware.js, contains: "runtime: 'experimental-edge'," }
---
# Expected report — 04-edge-middleware (negative)

Middleware that sets the edge runtime explicitly. The upgrade guide: "The `edge` runtime is NOT
supported in `proxy` ... If you want to continue using the `edge` runtime, keep using `middleware`."
The `middleware-to-proxy` codemod renames it and drops the runtime anyway; the stage restores the file.
On Next.js 16 it builds with a deprecation warning and keeps tagging API responses.

Manual follow-up (1): move to `proxy` only once the code is known to work on the Node.js runtime.
