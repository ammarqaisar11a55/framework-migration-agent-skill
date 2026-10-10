---
kind: negative
findings:
  - { rule: javax-string-literal, file: src/main/java/com/example/DatabaseSettings.java, line: 7 }
  - { rule: javax-string-literal, file: src/test/java/com/example/TokensTest.java, line: 17 }
  - { rule: javax-string-literal, file: src/test/java/com/example/TokensTest.java, line: 24 }
manual_items: 3
must_remain:
  - { file: src/main/java/com/example/DatabaseSettings.java, contains: "static final String LEGACY_URL_KEY = \"javax.persistence.jdbc.url\";" }
  - { file: src/test/java/com/example/TokensTest.java, contains: "legacy.setProperty(\"javax.persistence.jdbc.url\", \"jdbc:h2:mem:old\");" }
---
# Expected report — 04-jdk-javax-and-strings (negative)

HMAC signing with `javax.crypto` (part of the JDK, not Java EE) and a settings reader that accepts
both the old `javax.persistence.jdbc.url` key and the Jakarta one.

Nothing changes: the JDK's `javax` packages are not renamed, and the recipe does not touch strings.
The legacy key is reported for review, since it stays on purpose here to keep old configuration
working.

Manual follow-ups (3): review each `javax.persistence` string.
