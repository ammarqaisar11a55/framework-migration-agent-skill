---
kind: positive
findings:
  - { rule: junit4-dependency, file: pom.xml, line: 17 }
  - { rule: assertions-with-message, file: src/test/java/com/example/BillingServiceTest.java, line: 3 }
  - { rule: runner, file: src/test/java/com/example/BillingServiceTest.java, line: 16 }
  - { rule: lifecycle-annotations, file: src/test/java/com/example/BillingServiceTest.java, line: 23 }
  - { rule: test-expected-timeout, file: src/test/java/com/example/BillingServiceTest.java, line: 35 }
manual_items: 0
---
# Expected report — 03-mockito-runner

A service tested with `@RunWith(MockitoJUnitRunner.class)` and Mockito 4.11.

What the migration must do: `@ExtendWith(MockitoExtension.class)` with
`@MockitoSettings(strictness = Strictness.WARN)`; `org.mockito:mockito-junit-jupiter` added (the recipe
reuses the mockito-core entry's version); `expected =` around a try/finally → `assertThrows` with the
block as a lambda. Both tests pass.
