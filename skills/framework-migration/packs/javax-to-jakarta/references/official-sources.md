# Official sources

`jakarta.ee` and `docs.openrewrite.org` were not reachable from the environment the pack was written
in. The recipe was read from `openrewrite/rewrite-migrate-java` (tag `v3.42.1`, commit `c5ef164c`);
artifact versions from Maven Central.

| Source | URL | Used for | Verified via | Verified |
|---|---|---|---|---|
| OpenRewrite `JakartaEE10` (rewrite-migrate-java 3.42.1) | https://docs.openrewrite.org/recipes/java/migrate/jakarta/jakartaee10 | What it migrates: `JavaxMigrationToJakarta` (packages and API artifacts per specification), `MigrationToJakarta10Apis` (API versions: validation 3.0.x, xml.bind 4.0.x, json 2.1.x, el 5.0.x, servlet 6.0.x, persistence 3.1.x, annotation 2.1.x, ...), descriptor namespaces for beans.xml, ejb-jar.xml, validation.xml; implementation upgrades only for Jersey, Yasson, EclipseLink and a few others | `src/main/resources/META-INF/rewrite/jakarta-ee-9.yml`, `jakarta-ee-10.yml`; runs on the fixtures | 2026-10-10 |
| Jakarta EE 9 namespace change | https://jakarta.ee/blogs/javax-jakartaee-namespace-ecosystem-progress/ | `javax.*` Java EE packages become `jakarta.*`; the JDK's own `javax` packages (`javax.crypto`, `javax.sql`, ...) are unaffected | recipe package lists (which rename only Java EE packages) | 2026-10-10 |
| Jakarta EE 10 implementations | https://jakarta.ee/specifications/platform/10/ | Hibernate Validator 8.0 (Jakarta Validation 3.0), Eclipse Expressly 5.0 (Jakarta EL 5.0), Eclipse Parsson 1.1 (Jakarta JSON Processing 2.1), GlassFish JAXB runtime 4.0 (Jakarta XML Binding 4.0), Guice 7 (jakarta.inject) | Maven Central artifacts; runs on the fixtures (each fails at run time with the javax-era implementation) | 2026-10-10 |
| rewrite-maven-plugin 6.46.1 | https://docs.openrewrite.org/reference/rewrite-maven-plugin | Running recipes by coordinates without editing the pom; `dryRun` patch output | Maven Central; runs | 2026-10-10 |
