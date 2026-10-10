# Known pitfalls

**Custom rules are not migrated, and Jupiter ignores @Rule.** The recipe converts the rules it knows
and moves `@Test` to Jupiter everywhere else, so a test with a custom `TestRule` would run without it
(or not compile once `junit:junit` is gone). The stage keeps such classes, and the rule classes, on
JUnit 4: they are excluded from the recipe, `junit:junit` stays, and `junit-vintage-engine` runs them
on the JUnit Platform next to the migrated tests. Port the rule to a Jupiter extension later.

**Hamcrest was a transitive dependency.** JUnit 4 brought hamcrest-core; Jupiter does not, and the
recipe's own `ExpectedException` rewrite uses `assertThat(..., containsString(...))`. The stage adds
`org.hamcrest:hamcrest` when test code imports it.

**Maven only.** The runner invokes the rewrite-maven-plugin by coordinates. For Gradle builds it stops
and prints the recipe and module to run with OpenRewrite's Gradle plugin.

**Run the stage once.** Running the recipe a second time on a tree it already changed can fail to
compile the sources it parses; reset to the previous commit before rerunning a failed stage.

**Parameterized tests change shape.** Constructor-injected parameters become method parameters of a
`@ParameterizedTest` with `@MethodSource`; the recipe keeps a generated `init...` method and the
fields. It works; tidy it by hand if wanted.

**Mockito strictness.** `MockitoJUnitRunner` becomes `@ExtendWith(MockitoExtension.class)` with
`@MockitoSettings(strictness = Strictness.WARN)`, matching the runner's leniency; switch to strict
stubs separately.

**Other runners.** `Theories`, `Categories` suites and custom runners are reported (rule
`other-runner`); check what the recipe did with each.
