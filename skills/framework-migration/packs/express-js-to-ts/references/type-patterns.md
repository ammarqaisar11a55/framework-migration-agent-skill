# Type patterns

How the pack types common Express JavaScript, and what the agent should write by hand when a
codemod leaves something untyped. Sources are listed in `official-sources.md`.

## Handlers passed inline need nothing

```ts
app.get('/users/:id', (req, res) => { ... });
router.use(async (req, res, next) => { ... });
```

`@types/express` types the callback from context, including `req.params` from the route string.
`add-handler-types.js` and the `untyped-express-handler` rule both skip functions passed directly to
`use`, `all`, `get`, `post`, `put`, `patch`, `delete`, `options`, `head` and `param`.

## Named middleware and handlers get explicit types

```ts
import type { Request, Response, NextFunction } from 'express';

function logger(req: Request, res: Response, next: NextFunction) { ... }
export const loadUser = function (req: Request, res: Response, next: NextFunction) { ... };
```

Matched by parameter name: `req`/`request`, `res`/`response`, `next` (an `_` prefix is allowed).
Functions with other parameter names are left for the agent; type them the same way, or with the
`RequestHandler` type when the function is assigned to a variable:

```ts
const auth: RequestHandler = (q, s, n) => { ... };
```

## Error handlers keep four parameters

```ts
function errorHandler(err: any, req: Request, res: Response, next: NextFunction) { ... }
```

`err` is `any` because that is its type in `ErrorRequestHandler`. Narrow it inside the function
(`err instanceof Error`, a `status` check) if needed, but never remove `next`: Express recognises
error handlers by their four arguments, even when `next` is unused. If a linter complains about the
unused parameter, rename it to `_next`; do not delete it.

## Per-request data: `res.locals` or a declared `req` property

`req.user = ...` does not compile, because `Request` does not declare `user`. Two options, both from
the Express and TypeScript docs:

1. Store it on `res.locals`, which is typed `Record<string, any>`. This is what fixture
   `02-middleware-chain` does.
2. Declare the property with global augmentation, in a `.ts` file that is a module and is included
   by `tsconfig.json`:

   ```ts
   // src/types/express.d.ts
   export {};
   declare global {
     namespace Express {
       interface Request {
         user?: { id: number; name: string };
       }
     }
   }
   ```

Option 2 keeps the runtime code unchanged, so it is the default when the property is read in many
places. Either way the codemods do not do it: the `req-custom-property` rule reports it as a manual
item.

## Module shape: `export default` or `export =`

`cjs-to-esm.js` chooses per file:

| CommonJS | TypeScript | When |
|---|---|---|
| `exports.a = ...`, `module.exports = { a, b }` | `export const a = ...`, `export { a, b }` | Always, for object literals of names |
| `module.exports = value` | `export default value` | Every importer is a CommonJS file being rewritten in the same pass |
| `module.exports = value` | `export = value` | An ES module (`.mjs`) default-imports it, or something loads it with a dynamic `require()`, or nothing imports it statically |

`export =` keeps `module.exports` exactly as it was, which is what ES module default imports and
dynamic loaders read. Its CommonJS importers then use `import x = require('./x')`.

`import x from 'express'` works for CommonJS packages because `module: node16` implies
`esModuleInterop`.

## Untyped values under `strict`

`strict` turns on `noImplicitAny`. Parameters that are neither Express handler parameters nor
inferable from a default value (helpers like `function format(user)`) fail the strictness gate.
The agent types them by reading how they are called. Prefer the narrowest type the call sites
prove, and use `unknown` over `any` when the value is only passed through.
