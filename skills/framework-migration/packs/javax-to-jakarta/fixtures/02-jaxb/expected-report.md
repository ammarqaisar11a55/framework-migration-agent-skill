---
kind: positive
findings:
  - { rule: javax-ee-dependency, file: pom.xml, line: 16 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/Invoice.java, line: 6 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/Invoice.java, line: 7 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/Invoice.java, line: 8 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/Invoice.java, line: 9 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/Invoice.java, line: 10 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/InvoiceXml.java, line: 5 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/InvoiceXml.java, line: 6 }
  - { rule: javax-ee-imports, file: src/main/java/com/example/InvoiceXml.java, line: 7 }
manual_items: 0
---
# Expected report — 02-jaxb

JAXB 2.3 (`javax.xml.bind:jaxb-api` with `org.glassfish.jaxb:jaxb-runtime` 2.3.9).

What the migration must do: `javax.xml.bind` → `jakarta.xml.bind`; `jaxb-api` →
`jakarta.xml.bind:jakarta.xml.bind-api` 4.0.5 (recipe). The recipe moves jaxb-runtime only to 3.0.2
(Jakarta EE 9); jakarta-implementations.js moves it to 4.0.5, matching the 4.0 API.

Marshalling and unmarshalling tests pass.
