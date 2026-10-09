import { dartAdapter } from "../adapters/dart/index.ts";
import { dotnetAdapter } from "../adapters/dotnet/index.ts";
import { goAdapter } from "../adapters/go/index.ts";
import { jvmAdapter } from "../adapters/jvm/index.ts";
import { nodeAdapter } from "../adapters/node/index.ts";
import { phpAdapter } from "../adapters/php/index.ts";
import { pythonAdapter } from "../adapters/python/index.ts";
import { rubyAdapter } from "../adapters/ruby/index.ts";
import type { Adapter } from "./adapter.ts";
import type { Ecosystem } from "./types.ts";

export const ADAPTERS: readonly Adapter[] = [
  nodeAdapter, pythonAdapter, jvmAdapter, dotnetAdapter, phpAdapter, rubyAdapter, dartAdapter, goAdapter,
];

export function adapterFor(ecosystem: Ecosystem): Adapter {
  const adapter = ADAPTERS.find((a) => a.ecosystem === ecosystem);
  if (adapter === undefined) throw new Error(`No adapter for ecosystem "${ecosystem}"`);
  return adapter;
}
