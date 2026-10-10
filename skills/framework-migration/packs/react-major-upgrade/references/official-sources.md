# Official sources

`react.dev` was not reachable from the environment the pack was written in. The upgrade guide was
checked against its source in `reactjs/react.dev`, which the published page is built from.

| Source | URL | Used for | Verified via | Verified |
|---|---|---|---|---|
| React 19 Upgrade Guide | https://react.dev/blog/2024/04/25/react-19-upgrade-guide | Every rule; upgrading to 18.3 first ("identical to 18.2 but adds warnings for deprecated APIs"); the migration recipe's codemods; removed `ReactDOM.render` / `hydrate` / `unmountComponentAtNode` / `findDOMNode`, string refs, legacy context, `createFactory`, `react-dom/test-utils`, shallow renderer; `propTypes` and function-component `defaultProps` removed (default parameters instead); deprecated `element.ref` and `react-test-renderer`; TypeScript changes and `types-react-codemod` | `reactjs/react.dev` `src/content/blog/2024/04/25/react-19-upgrade-guide.md` | 2026-10-09 |
| react-codemod | https://github.com/reactjs/react-codemod | `replace-reactdom-render`, `replace-string-ref`, `replace-act-import`, `replace-use-form-state`, run from source at commit `5207d594fad6f8b39c51fd7edd2bcb51047dc872` with jscodeshift 17.4.0 (the npm package 5.4.4 does not include these TypeScript transforms); their behaviour checked against the repository's test fixtures | Repository at that commit; npm tarball of react-codemod 5.4.4 | 2026-10-09 |
| types-react-codemod README | https://github.com/eps1lon/types-react-codemod | `npx types-react-codemod <codemod> <paths...>`, `preset-19` (rule `types-react`; not run automatically) | `eps1lon/types-react-codemod` README | 2026-10-09 |
| npm registry: react, react-dom, react-test-renderer, @types/react | https://www.npmjs.com/package/react | 18.3.1 (latest 18.x), 19.3.0 (latest), @types/react 18.3.31 / 19.3.0 | `npm view` | 2026-10-09 |
