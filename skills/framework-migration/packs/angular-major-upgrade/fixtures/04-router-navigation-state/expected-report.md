---
kind: negative
findings:
  - { rule: router-params-inheritance, file: src/app/app.config.ts, line: 9 }
  - { rule: router-get-current-navigation, file: src/app/pages/detail.ts, line: 11 }
manual_items: 2
must_remain:
  - { file: src/app/pages/detail.ts, contains: "inject(Router).getCurrentNavigation()?.extras.state?.['from']" }
  - { file: src/app/app.config.ts, contains: "provideRouter(routes)," }
---
# Expected report — 04-router-navigation-state (negative)

OnPush components with routing, and a page that reads navigation state with
`Router.getCurrentNavigation()`, deprecated since 20.2 for the `currentNavigation` signal.

ng update does not run the `router-current-navigation` migration (it is optional), and no migration
sets `paramsInheritanceStrategy`, whose default changes in 22. Both stay as they are and are reported;
the components already set `changeDetection`, so they get no `Eager`. Only package versions and
tsconfig change. The navigation-state test passes on 22.

Manual follow-ups (2): run `ng update @angular/core --name router-current-navigation` (or call
`router.currentNavigation()`), and check route parameter inheritance.
