---
kind: positive
findings:
  - { rule: javax-ee-dependency, file: pom.xml, line: 16 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/Signup.java, line: 3 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/Signup.java, line: 4 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/Signup.java, line: 5 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/Signup.java, line: 6 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/SignupValidator.java, line: 5 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/SignupValidator.java, line: 6 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/SignupValidator.java, line: 7 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/SignupValidator.java, line: 8 }
manual_items: 0
---
# Expected report — 01-bean-validation

Bean Validation 2.0 (`javax.validation`) with Hibernate Validator 6.2 and the GlassFish EL 3.0
implementation.

What the migration must do:

- JakartaEE10 recipe: `javax.validation` imports → `jakarta.validation`; `validation-api` 2.0.1 →
  `jakarta.validation-api` 3.0.2.
- jakarta-implementations.js: Hibernate Validator 6.2.5 → 8.0.5.Final; `org.glassfish:jakarta.el` 3.0.4
  → `org.glassfish.expressly:expressly` 5.0.0. Without these the tests fail at run time: Hibernate
  Validator 6 provides no `jakarta.validation` implementation.

The three validation tests pass on Jakarta EE 10.
