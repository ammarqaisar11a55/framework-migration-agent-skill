# Known pitfalls

## The order of the stages

The upgrade guide recommends React 18.3 first: it is 18.2 plus warnings for everything React 19
removes, and it already has `createRoot`, `React.act` and callback refs. So the pack upgrades to
18.3.1, applies every codemod while still on 18.3 (gate: tests on 18.3), and only then upgrades to
19 (gate: tests on 19). A failure at the last gate is about React 19 itself, not about a codemod.
React 17 projects go through the same path.

## `createRoot` renders asynchronously

`ReactDOM.render` committed synchronously; `createRoot(container).render(el)` schedules the work.
Code that reads the DOM right after rendering — tests above all — must wrap the render in `act()`
(tests) or `flushSync()` (application code). The official codemod does not add either. Read the
stage diff for every `render` call it rewrote; tests that already use `act`, as the React docs
recommend, keep working.

## Official codemod output

- `replace-reactdom-render` leaves the old `import ReactDOM from 'react-dom'` in place, and the
  codemods write double quotes. Run the project's linter or formatter afterwards.
- `replace-string-ref` stores nodes in `this.refs`, so existing `this.refs.name` reads keep working.
- `prop-types-typescript`, the fifth codemod in the guide's recipe, converts `propTypes` to TypeScript
  types and is not run: it only applies to TypeScript sources and changes types, not behaviour.

## `defaultProps` on function components

React 19 ignores them — silently, so this is a behaviour change without an error.
`function-default-props.js` moves them into the destructured parameters when that is exact (literal
or identifier values, destructured props, no `...rest` that would change). Everything else stays
and is reported (rule `function-default-props`). For an object, array or function default, hoist the
value into a module-level constant and use it as the parameter default, so every render still gets
the same instance. Class components keep `defaultProps`.

## Removed APIs without a codemod

| API | Rule | Replacement |
|---|---|---|
| `ReactDOM.hydrate` | `reactdom-hydrate` | `hydrateRoot(container, element)` |
| `unmountComponentAtNode` | `unmount-component-at-node` | keep the root, call `root.unmount()` |
| `findDOMNode` | `find-dom-node` | a ref on the DOM element |
| Legacy context | `legacy-context` | `createContext` + `contextType` / `useContext` |
| `React.createFactory` | `create-factory` | JSX or `createElement` |
| `react-test-renderer/shallow` | `shallow-renderer` | `react-shallow-renderer`, or Testing Library |

These break on React 19, so the last gate fails until they are fixed by hand.

## Deprecated but working

`react-test-renderer` (wrap `create` in `act`, which React 18 also needed for a committed tree),
`element.ref`, and `propTypes` (no longer checked) keep working on React 19 and are reported.

## TypeScript

The `react-19` stage moves `@types/react` and `@types/react-dom` to 19.3.0 with React. The type
changes (removed deprecated types, `useRef` requiring an argument, ref callbacks that must not
return a value, the global `JSX` namespace) are handled by `types-react-codemod`, which the pack
reports (rule `types-react`) rather than runs: run
`npx types-react-codemod@3.5.3 preset-19 ./src` after the stage and type-check.

## Libraries

Libraries that use React internals (`__SECRET_INTERNALS…`) or peer-depend on older React versions
may block the upgrade. `npm install` reports peer conflicts at the `react-19` stage; the stage notes
list peer ranges the pack did not widen.
