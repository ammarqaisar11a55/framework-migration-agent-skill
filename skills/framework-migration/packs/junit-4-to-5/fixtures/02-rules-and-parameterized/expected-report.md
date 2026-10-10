---
kind: positive
findings:
  - { rule: junit4-dependency, file: pom.xml, line: 17 }
  - { rule: assertions-with-message, file: src/test/java/com/example/NoteStoreTest.java, line: 3 }
  - { rule: assertions-with-message, file: src/test/java/com/example/NoteStoreTest.java, line: 4 }
  - { rule: supported-rules, file: src/test/java/com/example/NoteStoreTest.java, line: 15 }
  - { rule: supported-rules, file: src/test/java/com/example/NoteStoreTest.java, line: 18 }
  - { rule: assertions-with-message, file: src/test/java/com/example/SlugTest.java, line: 3 }
  - { rule: runner, file: src/test/java/com/example/SlugTest.java, line: 12 }
manual_items: 0
---
# Expected report — 02-rules-and-parameterized

`TemporaryFolder` and `ExpectedException` rules, an assumption, and a `Parameterized` runner with
constructor injection.

What the migration must do:

- `TemporaryFolder` → `@TempDir File` (with a generated `newFolder` helper); `ExpectedException` →
  `assertThrows` plus Hamcrest `assertThat(message, containsString(...))`; `assumeTrue` with the
  message last.
- `@RunWith(Parameterized.class)` → `@ParameterizedTest` with `@MethodSource("cases")`.
- finish-junit5.js adds `org.hamcrest:hamcrest` 3.0 (test): JUnit 4 provided it transitively, and the
  converted test now imports it.

All 7 tests pass on JUnit 5.
