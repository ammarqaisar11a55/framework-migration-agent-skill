import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Pack fixtures are migration inputs/outputs, not engine code.
    ignores: ["node_modules/", "dist/", "coverage/", "**/fixtures/**"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
  },
);
