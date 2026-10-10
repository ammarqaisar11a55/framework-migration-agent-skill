import { describe, expect, it } from "vitest";
import type { ProjectView } from "./adapter.ts";
import { detectStack, matchPacks, versionMatches } from "./detect-stack.ts";
import type { Pack, Stack } from "./types.ts";

const project = (files: Record<string, string>): ProjectView => ({
  files: Object.keys(files),
  read: (path) => files[path],
});

const only = (files: Record<string, string>): Stack => {
  const stacks = detectStack(".", project(files));
  expect(stacks).toHaveLength(1);
  return stacks[0] as Stack;
};

const versions = (stack: Stack): Record<string, string> =>
  Object.fromEntries(stack.frameworks.map((f) => [f.name, f.version]));

describe("detectStack", () => {
  it("node: package.json", () => {
    const stack = only({
      "package.json": JSON.stringify({
        engines: { node: ">=18" },
        dependencies: { express: "^4.18.2", lodash: "4.17.21" },
        devDependencies: { jest: "29.7.0" },
      }),
    });
    expect(stack).toMatchObject({ ecosystem: "node", language: "javascript", moduleType: "commonjs", runtime: "node >=18" });
    expect(versions(stack)).toEqual({ express: "^4.18.2", jest: "29.7.0", node: ">=18" });
  });

  it("node: tsconfig.json and type: module", () => {
    const stack = only({ "package.json": JSON.stringify({ type: "module", dependencies: { react: "17.0.2" } }), "tsconfig.json": "{}" });
    expect(stack).toMatchObject({ language: "typescript", moduleType: "module" });
  });

  it("python: requirements.txt", () => {
    const stack = only({ "requirements.txt": "# deps\nDjango>=3.2,<4.0\npydantic==1.10.13 ; python_version > '3.7'\n-r other.txt\nrequests\n" });
    expect(stack).toMatchObject({ ecosystem: "python", manifest: "requirements.txt" });
    expect(versions(stack)).toEqual({ django: ">=3.2,<4.0", pydantic: "==1.10.13" });
  });

  it("python: pyproject.toml (PEP 621 and Poetry)", () => {
    const pep621 = only({ "pyproject.toml": '[project]\nrequires-python = ">=3.9"\ndependencies = ["SQLAlchemy[asyncio]~=1.4", "pandas>=1.5"]\n' });
    expect(versions(pep621)).toEqual({ sqlalchemy: "~=1.4", pandas: ">=1.5", python: ">=3.9" });
    const poetry = only({ "pyproject.toml": '[tool.poetry.dependencies]\npython = "^2.7"\nflask = { version = "^1.1", extras = ["async"] }\n' });
    expect(versions(poetry)).toEqual({ flask: "^1.1", python: "^2.7" });
  });

  it("jvm: pom.xml with parent, properties and dependencies", () => {
    const stack = only({
      "pom.xml": `<project>
        <parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>2.7.18</version></parent>
        <properties><java.version>1.8</java.version><junit.version>4.13.2</junit.version></properties>
        <dependencies>
          <dependency><groupId>javax.servlet</groupId><artifactId>javax.servlet-api</artifactId><version>4.0.1</version></dependency>
          <dependency><groupId>junit</groupId><artifactId>junit</artifactId><version>\${junit.version}</version></dependency>
        </dependencies></project>`,
    });
    expect(stack).toMatchObject({ ecosystem: "jvm", language: "java", runtime: "java 1.8" });
    expect(versions(stack)).toEqual({ "spring-boot": "2.7.18", javax: "4.0.1", junit: "4.13.2", java: "1.8" });
  });

  it("jvm: build.gradle and build.gradle.kts", () => {
    const groovy = only({
      "build.gradle": "plugins {\n  id 'org.springframework.boot' version '2.6.4'\n}\nsourceCompatibility = '11'\ndependencies {\n  testImplementation 'org.junit.jupiter:junit-jupiter:5.8.2'\n}\n",
    });
    expect(versions(groovy)).toEqual({ "spring-boot": "2.6.4", junit: "5.8.2", java: "11" });
    const kts = only({
      "build.gradle.kts": 'plugins { id("org.springframework.boot") version "3.2.0" }\njava { toolchain { languageVersion.set(JavaLanguageVersion.of(17)) } }\n',
    });
    expect(kts.language).toBe("kotlin");
    expect(versions(kts)).toEqual({ "spring-boot": "3.2.0", java: "17" });
  });

  it("dotnet: legacy and SDK-style .csproj", () => {
    const legacy = only({
      "src/Web/Web.csproj": '<Project><PropertyGroup><TargetFrameworkVersion>v4.8</TargetFrameworkVersion></PropertyGroup>\n<ItemGroup><Reference Include="Microsoft.AspNet.Mvc, Version=5.2.7.0" /></ItemGroup></Project>',
    });
    expect(legacy.manifest).toBe("src/Web/Web.csproj");
    expect(versions(legacy)).toEqual({ "dotnet-framework": "4.8", "aspnet-mvc": "*" });
    const sdk = only({
      "App.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup>\n<ItemGroup><PackageReference Include="Xamarin.Forms" Version="5.0.0.2612" /></ItemGroup></Project>',
    });
    expect(versions(sdk)).toEqual({ dotnet: "8.0", "aspnet-core": "8.0", "xamarin-forms": "5.0.0.2612" });
    expect(versions(only({ "Old.csproj": "<Project><PropertyGroup><TargetFramework>net472</TargetFramework></PropertyGroup></Project>" }))).toEqual({ "dotnet-framework": "4.7.2" });
  });

  it("php: composer.json", () => {
    const stack = only({ "composer.json": JSON.stringify({ require: { php: "^7.4", "laravel/framework": "^8.75" }, "require-dev": { "phpunit/phpunit": "^9.5" } }) });
    expect(stack).toMatchObject({ ecosystem: "php", runtime: "php ^7.4" });
    expect(versions(stack)).toEqual({ php: "^7.4", laravel: "^8.75", phpunit: "^9.5" });
  });

  it("ruby: Gemfile", () => {
    const stack = only({ Gemfile: "source 'https://rubygems.org'\nruby '3.0.6'\ngem 'rails', '~> 6.1', '>= 6.1.4'\ngem \"puma\"\n" });
    expect(versions(stack)).toEqual({ rails: "~> 6.1, >= 6.1.4", ruby: "3.0.6" });
  });

  it("dart: pubspec.yaml", () => {
    const stack = only({ "pubspec.yaml": "name: app\nenvironment:\n  sdk: '>=2.19.0 <3.0.0'\n  flutter: '>=3.7.0'\ndependencies:\n  flutter:\n    sdk: flutter\n  provider: ^6.0.5\n" });
    expect(versions(stack)).toEqual({ dart: ">=2.19.0 <3.0.0", flutter: ">=3.7.0", provider: "^6.0.5" });
  });

  it("go: go.mod", () => {
    const stack = only({ "go.mod": "module example.com/app\n\ngo 1.19\n\nrequire (\n\tgithub.com/gin-gonic/gin v1.9.1\n\tgolang.org/x/text v0.14.0 // indirect\n)\n" });
    expect(stack.runtime).toBe("go 1.19");
    expect(versions(stack)).toEqual({ go: "1.19", gin: "v1.9.1" });
  });

  it("reports every stack of a polyglot repo, and none for an empty one", () => {
    const stacks = detectStack(".", project({ "package.json": "{}", "go.mod": "module x\ngo 1.22\n", "requirements.txt": "" }));
    expect(stacks.map((s) => s.ecosystem)).toEqual(["node", "python", "go"]);
    expect(detectStack(".", project({ "README.md": "" }))).toEqual([]);
  });

  it("survives a malformed manifest", () => {
    expect(detectStack(".", project({ "package.json": "{ nope", "composer.json": "{ nope" })).map((s) => s.ecosystem)).toEqual(["php"]);
  });
});

describe("versionMatches", () => {
  it.each([
    ["^4.18.2", "4.x", true],
    ["4.17.1", "4.x", true],
    ["^5.0.0", "4.x", false],
    ["~> 6.1", "6.x", true],
    ["==1.10.13", "1.x", true],
    [">=3.2,<4.0", "3.x", true],
    ["v1.9.1", "1.x", true],
    ["*", "4.x", "unknown"],
    ["latest", "4.x", "unknown"],
  ] as const)("%s in %s → %s", (declared, range, expected) => {
    expect(versionMatches(declared, range)).toBe(expected);
  });
});

describe("matchPacks", () => {
  const pack = (id: string, framework: string, versions: string, language?: string): Pack => ({
    id, title: id, ecosystem: "node", tier: 1, status: "shipped", dir: `/packs/${id}`,
    from: language === undefined ? { framework, versions } : { framework, versions, language },
    to: { framework, versions }, tools: [], stages: [{ id: "s" }], checks: { test: "npm test" },
  });
  const stack: Stack = { ecosystem: "node", manifest: "package.json", language: "javascript", frameworks: [{ name: "express", version: "^4.18.2" }] };

  it("matches on ecosystem, framework, version range and language", () => {
    const packs = [pack("js-to-ts", "express", "4.x", "javascript"), pack("ts-only", "express", "4.x", "typescript"), pack("v3", "express", "3.x"), pack("react", "react", "17.x")];
    expect(matchPacks([stack], packs).map((m) => m.pack.id)).toEqual(["js-to-ts"]);
  });

  it("keeps a pack whose version cannot be verified, and says so", () => {
    const loose: Stack = { ...stack, frameworks: [{ name: "express", version: "latest" }] };
    expect(matchPacks([loose], [pack("js-to-ts", "express", "4.x")])).toMatchObject([{ versionVerified: false }]);
  });

  it("returns nothing when no pack fits (inventory + detection only)", () => {
    expect(matchPacks([stack], [pack("react", "react", "17.x")])).toEqual([]);
  });
});
