---
kind: positive
findings:
  - { rule: javax-ee-dependency, file: pom.xml, line: 16 }
  - { rule: javax-ee-dependency, file: pom.xml, line: 26 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/OrderSummary.java, line: 5 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/OrderSummary.java, line: 6 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/OrderSummary.java, line: 7 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/OrderSummary.java, line: 8 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/OrderSummary.java, line: 9 }
manual_items: 0
---
# Expected report — 03-json-and-inject

JSON-P 1.1 (`javax.json` with the GlassFish implementation) and `javax.inject` injection with Guice
5.1.

What the migration must do:

- `javax.json` → `jakarta.json`, `javax.inject` → `jakarta.inject`; `jakarta.json-api` 2.1.3 and
  `jakarta.inject-api` 2.0.1.
- The recipe moves the JSON-P implementation to `org.glassfish:jakarta.json` 2.0.1 (JSON-P 2.0), which
  the 2.1 API cannot load ("Provider org.eclipse.parsson.JsonProviderImpl not found");
  jakarta-implementations.js replaces it with `org.eclipse.parsson:parsson` 1.1.7.
- Guice 5.1 reads `javax.inject` only; it becomes Guice 7.0.0, which reads `jakarta.inject`.

Both tests (JSON output, singleton scope through Guice) pass.
