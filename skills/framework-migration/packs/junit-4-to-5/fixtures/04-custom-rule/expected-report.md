---
kind: negative
findings:
  - { rule: junit4-dependency, file: pom.xml, line: 17 }
  - { rule: custom-rule, file: src/test/java/com/example/DefaultLocaleRule.java, line: 9 }
  - { rule: custom-rule, file: src/test/java/com/example/GreeterEnglishTest.java, line: 11 }
  - { rule: assertions-with-message, file: src/test/java/com/example/GreeterNameTest.java, line: 3 }
  - { rule: custom-rule, file: src/test/java/com/example/GreeterTest.java, line: 11 }
manual_items: 3
must_remain:
  - { file: src/test/java/com/example/DefaultLocaleRule.java, contains: "public class DefaultLocaleRule implements TestRule {" }
  - { file: src/test/java/com/example/GreeterTest.java, contains: "public DefaultLocaleRule french = new DefaultLocaleRule(Locale.FRENCH);" }
  - { file: src/test/java/com/example/GreeterEnglishTest.java, contains: "public DefaultLocaleRule english = new DefaultLocaleRule(Locale.ENGLISH);" }
---
# Expected report — 04-custom-rule (negative)

Two tests use a custom `TestRule` that sets the default locale; one plain test does not.

Migrated naively, the rule's tests would move to Jupiter, where `@Rule` is ignored: the French test
would run in the default locale, or (with `junit:junit` removed) not compile. The stage excludes the
rule and the classes using it from the recipe, so they stay JUnit 4; `GreeterNameTest` moves to
Jupiter. finish-junit5.js keeps `junit:junit` 4.13.2 (the recipe removes it) and adds
`junit-vintage-engine` 5.14.4, so all three tests run on the JUnit Platform.

Manual follow-ups (3): port `DefaultLocaleRule` to a Jupiter extension and move the two tests.
