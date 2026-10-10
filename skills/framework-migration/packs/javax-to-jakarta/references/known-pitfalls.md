# Known pitfalls

**Implementations stay on javax unless the pack moves them.** The recipe renames packages and API
artifacts, but a javax-era implementation (Hibernate Validator 6, GlassFish EL 3, GlassFish JSON-P,
JAXB runtime 2.x/3.x, Guice 5) compiles and then fails at run time: "no validation provider",
"Provider org.eclipse.parsson.JsonProviderImpl not found", injection that silently does not happen.
The stage replaces the ones it knows; others are noted when their coordinates still name javax. Look
for the run-time failure in the gate and check every library that reads Jakarta APIs (ORMs, JSON
binders, servlet containers, DI containers).

**Recipe versions drift.** The recipe picks "newest 3.0.x / 2.1.x / ..." from Maven Central when it
runs, and fewer changes happen when Central rate-limits it. The stage pins every API and
implementation listed in `pack.yaml`, so repeated runs give the same pom; still read the diff.

**Strings are not migrated.** Class names for reflection, `javax.persistence.*` property keys in code
or configuration files, and service-loader files under `META-INF/services` keep their javax names
(rule `javax-string-literal`). Decide per string.

**The JDK's javax packages stay.** `javax.crypto`, `javax.net.ssl`, `javax.sql`, `javax.naming`,
`javax.management`, `javax.xml.parsers`, `javax.swing` and JSR-305 `javax.annotation.Nonnull` are not
Java EE; nothing renames them.

**Descriptors.** beans.xml, ejb-jar.xml and validation.xml are updated by the recipe; web.xml,
persistence.xml and faces-config.xml are reported for a manual check against the Jakarta EE 10
schemas.

**Frameworks have their own migration.** Spring Framework 6 / Spring Boot 3, Hibernate ORM 6,
Jersey 3, Jetty 11+ and Tomcat 10+ are the Jakarta versions of those stacks; migrate those with their
own upgrade guides (a Spring Boot 2 application moves to Jakarta as part of its Spring Boot 3 upgrade).

**Maven only.** As with the other JVM packs, Gradle builds get the recipe name and stop.
