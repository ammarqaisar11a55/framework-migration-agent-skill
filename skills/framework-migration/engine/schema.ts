import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import { schemasDir } from "./paths.ts";

export type SchemaName = "pack" | "rules" | "inventory" | "findings";

const ajv = new Ajv({ allErrors: true, strict: true });
const compiled = new Map<SchemaName, ValidateFunction>();

function validator(name: SchemaName): ValidateFunction {
  let fn = compiled.get(name);
  if (fn === undefined) {
    fn = ajv.compile(JSON.parse(readFileSync(join(schemasDir(), `${name}.schema.json`), "utf8")) as object);
    compiled.set(name, fn);
  }
  return fn;
}

function describe(error: ErrorObject): string {
  const where = error.instancePath === "" ? "(root)" : error.instancePath;
  const params = error.params as Record<string, unknown>;
  switch (error.keyword) {
    case "required":
      return `${where}: missing required property "${String(params["missingProperty"])}"`;
    case "additionalProperties":
      return `${where}: unknown property "${String(params["additionalProperty"])}"`;
    case "enum":
      return `${where}: must be one of ${JSON.stringify(params["allowedValues"])}`;
    default:
      return `${where}: ${error.message ?? error.keyword}`;
  }
}

/** Returns human-readable errors; an empty array means the value is valid. */
export function validate(name: SchemaName, value: unknown): string[] {
  const fn = validator(name);
  if (fn(value)) return [];
  const errors = (fn.errors ?? []).filter((e) => e.keyword !== "oneOf" || fn.errors?.length === 1);
  return [...new Set(errors.map(describe))];
}
