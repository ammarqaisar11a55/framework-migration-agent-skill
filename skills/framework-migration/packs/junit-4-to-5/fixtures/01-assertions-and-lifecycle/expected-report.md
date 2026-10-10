---
kind: positive
findings:
  - { rule: junit4-dependency, file: pom.xml, line: 17 }
  - { rule: assertions-with-message, file: src/test/java/com/example/CalculatorTest.java, line: 3 }
  - { rule: assertions-with-message, file: src/test/java/com/example/CalculatorTest.java, line: 4 }
  - { rule: lifecycle-annotations, file: src/test/java/com/example/CalculatorTest.java, line: 15 }
  - { rule: lifecycle-annotations, file: src/test/java/com/example/CalculatorTest.java, line: 20 }
  - { rule: test-expected-timeout, file: src/test/java/com/example/CalculatorTest.java, line: 31 }
  - { rule: test-expected-timeout, file: src/test/java/com/example/CalculatorTest.java, line: 37 }
  - { rule: lifecycle-annotations, file: src/test/java/com/example/CalculatorTest.java, line: 45 }
manual_items: 0
---
# Expected report — 01-assertions-and-lifecycle

A Maven project on JUnit 4.13.2: `@Before` / `@After`, assertions with a leading message,
`@Test(expected = ...)`, `@Test(timeout = ...)` and an `@Ignore`d test.

What the migration must do (OpenRewrite JUnit4to5Migration): `junit:junit` →
`org.junit.jupiter:junit-jupiter` 5.14.4; `@BeforeEach` / `@AfterEach` / `@Disabled`; the message moves
to the last argument; `expected` → `assertThrows`; `timeout` → `@Timeout`.

The same tests pass (4 run, 1 skipped) on JUnit 5.
