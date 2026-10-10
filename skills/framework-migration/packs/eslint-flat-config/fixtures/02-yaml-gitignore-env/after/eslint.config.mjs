import { defineConfig } from "eslint/config";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import { includeIgnoreFile } from "@eslint/compat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});
const gitignorePath = path.resolve(__dirname, ".gitignore");

export default defineConfig([includeIgnoreFile(gitignorePath), {
    extends: compat.extends("eslint:recommended"),

    languageOptions: {
        globals: {
            ...globals.node,
        },

        ecmaVersion: 2022,
        sourceType: "commonjs",
    },

    rules: {
        "no-var": "error",
        "prefer-const": "error",
    },
}, {
    files: ["**/*.mjs"],

    languageOptions: {
        sourceType: "module"
    }
}]);