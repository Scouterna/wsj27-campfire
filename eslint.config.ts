import js from "@eslint/js"
import prettier from "eslint-config-prettier"
import * as importX from "eslint-plugin-import-x"
import jsdoc from "eslint-plugin-jsdoc"
import * as jsonc from "eslint-plugin-jsonc"
import pluginN from "eslint-plugin-n"
import noSecrets from "eslint-plugin-no-secrets"
// @ts-expect-error - no published types
import promise from "eslint-plugin-promise"
import reactHooks from "eslint-plugin-react-hooks"
import * as regexp from "eslint-plugin-regexp"
// @ts-expect-error - no published types
import security from "eslint-plugin-security"
import sonarjs from "eslint-plugin-sonarjs"
import unicorn from "eslint-plugin-unicorn"
import globals from "globals"
import tseslint, { type ConfigArray } from "typescript-eslint"

/**
 * The one ESLint configuration for the whole repository: strict, type-aware TypeScript
 * linting plus JSON, security, and code-quality rules. Flat config expresses "these rules,
 * for these paths" directly, so there is no per-package eslint.config.ts – this single
 * root file covers every package. Markdown belongs to markdownlint.
 *
 * Most rules apply everywhere. The sections at the end are the ones that do not: browser
 * globals and React's rules for the code that runs in a browser, and the layering ban for
 * the code that must not reach upward.
 */

// Everything that runs in a browser. The two shells hold no TypeScript at all, so this is
// the whole of it.
const browser = ["apps/web/**/*.{ts,tsx}", "libraries/**/*.{ts,tsx}", "modules/**/*.{ts,tsx}"]

export default tseslint.config(
  // Global ignores. config/** is deliberately absent – tooling configuration is real code
  // and gets linted. Markdown is markdownlint's alone (see config/markdownlint/): ESLint
  // parsed it only to report the same findings a second time, so it does not look at it
  // now. The Structurizr workspace is written by the tool – the compiled model plus each
  // view's layout – and the generated element identifiers in it read as high-entropy
  // strings to the secret scanner.
  {
    ignores: [
      "**/.build/**",
      "**/node_modules/**",
      "**/*.{md,mdx}",
      "docs/architecture/workspace.json",
      // Gitignored scratch space for reference material under study – not this
      // repository's code.
      "temp/**",
      // The auth service's refresh script, copied into the mock verbatim from
      // wsj27-auth-api – its code, held to its repository's rules rather than to these.
      "tools/mock/static/**",
    ],
  },

  // JavaScript
  {
    ...js.configs.recommended,
    files: ["**/*.{ts,tsx}"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-console": "error",
    },
  },

  // TypeScript
  ...tseslint.configs.strictTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  ...tseslint.configs.stylisticTypeChecked.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        // One tsconfig.json, beside this file, covering every package – so the project
        // service has exactly one program to find and the root is simply here.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
    },
  },

  // JSON and JSONC
  ...jsonc.configs["flat/recommended-with-jsonc"].map((config) => ({
    ...config,
    files: ["**/*.{json,jsonc}"],
  })),

  // Security
  {
    ...security.configs.recommended,
    files: ["**/*.{ts,tsx}"],
  },
  {
    // detect-non-literal-fs-filename targets servers and is noise for tooling that works
    // on caller-supplied paths; detect-unsafe-regex false-positives on linear regexes,
    // and the regexp/* rules cover the real ReDoS risks.
    files: ["**/*.{ts,tsx}"],
    rules: {
      "security/detect-non-literal-fs-filename": "off",
      "security/detect-unsafe-regex": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx,json,jsonc}"],
    plugins: {
      "no-secrets": noSecrets,
    },
    rules: {
      "no-secrets/no-secrets": [
        "error",
        {
          // Long identifiers trip the entropy check without being secrets: TypeScript
          // compiler option names (noPropertyAccessFromIndexSignature and friends),
          // repository slugs, which are public by definition, Gradle's variant task
          // names, which are a verb with the flavor and the build type spelled onto the
          // end – assembleLocalDebugAndroidTest and its relatives – and the back-end's
          // own origin-relative addresses, which are long enough to look random once a
          // member number and an infolevel are on the end.
          ignoreContent: String.raw`no[A-Z][A-Za-z]+|verbatimModuleSyntax|^[a-z]+:[\w.-]+/[\w.-]+$|^@scouterna/[\w-]+$|(?:assemble|connected|install|lint|test)[A-Z][A-Za-z]+|^/api/[\w/.-]*(?:\?[\w=&.-]*)?$`,
        },
      ],
    },
  },

  // RegExp
  {
    ...regexp.configs["flat/recommended"],
    files: ["**/*.{ts,tsx}"],
  },

  // Code quality
  //
  // The preset is spread on its own and the overrides follow in a config object of their
  // own. A `rules` key beside a spread replaces the preset's whole rule map instead of
  // adding to it, which is how every rule the preset brings ends up silently inert.
  {
    ...(sonarjs.configs!["recommended"]! as ConfigArray[number]),
    files: ["**/*.{ts,tsx}"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "sonarjs/no-small-switch": "off",
    },
  },
  {
    ...unicorn.configs.recommended,
    files: ["**/*.{ts,tsx}"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // Allow the abbreviations that are good names in this domain; `err` stays flagged.
      // `env` is the Vite ecosystem's own convention (env.d.ts), and `props` is React's
      // own word for the one argument a component takes.
      "unicorn/name-replacements": [
        "error",
        {
          replacements: {
            arg: false,
            args: false,
            dir: false,
            dirs: false,
            doc: false,
            env: false,
            props: false,
            ref: false,
            refs: false,
            repository: false,
            tmp: false,
          },
        },
      ],
      "unicorn/filename-case": [
        "error",
        {
          cases: {
            kebabCase: true,
            pascalCase: true,
          },
        },
      ],
      // Reordering a condition to put the cheaper operand first buys nothing outside a
      // hot loop, and costs the reading order the author chose. The rule also asks the
      // reader to "verify short-circuit behavior" rather than proving it, so every report
      // needs judging by hand.
      "unicorn/prefer-simple-condition-first": "off",
    },
  },
  {
    ...promise.configs["flat/recommended"],
    files: ["**/*.{ts,tsx}"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "promise/prefer-await-to-then": "error",
      "promise/prefer-await-to-callbacks": "error",
    },
  },

  // Node.js
  {
    ...pluginN.configs["flat/recommended"],
    files: ["**/*.{ts,tsx}"],
    settings: {
      node: {
        version: ">=24.0.0",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // The development toolchain – Vitest, Playwright, Storybook – is declared once in
      // the root package.json and imported from every package, which is what a pnpm
      // workspace is for; the rule reads each package.json alone and calls all of it
      // extraneous.
      "n/no-extraneous-import": "off",
      // Resolution is TypeScript's and the bundler's here, and import-x/no-unresolved
      // already reports a specifier that leads nowhere; this rule only re-reports the
      // workspace packages and the extensionless relative imports as missing.
      "n/no-missing-import": "off",
    },
  },

  // Scripts
  {
    // scripts/ is the developer-facing command line – its output *is* its interface and
    // its exit code is its result, so writing to the console and calling `process.exit`
    // are what these files are for. Both bans exist to keep that out of library code.
    files: ["scripts/**/*.ts"],
    rules: {
      "n/no-process-exit": "off",
      "no-console": "off",
      "unicorn/no-process-exit": "off",
    },
  },

  // Imports and exports
  {
    ...importX.flatConfigs.recommended,
    files: ["**/*.{ts,tsx}"],
  },
  {
    ...importX.flatConfigs.typescript,
    files: ["**/*.{ts,tsx}"],
  },
  {
    // A cycle between modules works right up until one of them reads the other's
    // binding at evaluation time, and then it is an "X is undefined" at import time
    // with no obvious cause. Banned while the graph is young, so no cycle lives long
    // enough to look load-bearing.
    files: ["**/*.{ts,tsx}"],
    rules: {
      "import-x/no-cycle": "error",
    },
  },
  {
    // tools/* and scripts/* run their TypeScript natively on Node, which resolves a
    // relative import only with its explicit `.ts` extension. Everything else is bundled,
    // where extensionless is correct, so this holds for those two alone – and holds at
    // lint time rather than as a "module not found" the first time a script is run.
    files: ["scripts/**/*.ts", "tools/**/*.ts"],
    rules: {
      "import-x/extensions": ["error", "always", { ignorePackages: true, checkTypeImports: true }],
    },
  },

  // Complexity limits
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "max-depth": ["error", 4],
      "max-params": "off",
      "max-lines-per-function": [
        "error",
        {
          max: 100,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "max-lines": [
        "error",
        {
          max: 500,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  {
    // The mock's seed: stand-in records and the form template they answer, held as
    // TypeScript so the compiler checks their shape. A line limit is a rule about how
    // much logic one file should hold, and there is none here – a register is long
    // because every row carries a whole registration form, and splitting it by line
    // count would scatter it for nothing.
    files: ["tools/mock/seed/**/*.ts"],
    rules: {
      "max-lines": "off",
    },
  },
  {
    // `.test` is Vitest's and `.spec` is the Playwright walk-throughs' – two suites,
    // one set of relaxations. A walk-through is exactly the file that grows past 400
    // lines and reaches for `!` on a locator.
    files: ["**/*.{test,spec}.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "max-lines": "off",
      "max-lines-per-function": "off",
      // The `let x; beforeEach(() => { x = ... })` setup idiom is standard and
      // intentional in tests.
      "unicorn/no-top-level-assignment-in-function": "off",
    },
  },

  // JSDoc
  {
    ...jsdoc.configs["flat/recommended-typescript-error"],
    files: ["**/*.{ts,tsx}"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: [
            "ExportNamedDeclaration > FunctionDeclaration",
            "ExportDefaultDeclaration > FunctionDeclaration",
            "ExportNamedDeclaration > VariableDeclaration",
          ],
          publicOnly: true,
        },
      ],
      "jsdoc/require-param-description": "error",
      "jsdoc/require-returns-description": "error",
      // Whether a blank line separates the description from the first tag is the
      // author's call – both shapes are read the same way, and both are written here.
      // The one thing still held is that a block does not end on an empty line, and
      // `null` is this rule's own word for "do not count the lines at the start".
      // eslint-disable-next-line unicorn/no-null
      "jsdoc/tag-lines": ["error", "any", { startLines: null }],
    },
  },
  {
    // A story's name and rendered output are its description; a JSDoc line above each
    // export would only repeat the title.
    files: ["**/*.stories.{ts,tsx}"],
    rules: {
      "jsdoc/require-jsdoc": "off",
    },
  },
  {
    // A test helper's JSDoc is a one-line note to whoever reads the file next rather
    // than a contract for a caller elsewhere – nothing outside the suite can reach it.
    // The rule that matters, `require-jsdoc`, is already public-only.
    files: ["**/*.{test,spec}.{ts,tsx}"],
    rules: {
      "jsdoc/require-param": "off",
      "jsdoc/require-returns": "off",
    },
  },

  // --- The parts that are not repository-wide ---

  // Browser code gets the browser's globals. Everything else is Node's, which the
  // `types` in tsconfig.json already supplies.
  {
    files: browser,
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    // eslint-plugin-n reads every file as Node's, and this code is the browser's: it
    // reports `navigator` – a browser global since forever – as an experimental Node
    // builtin. The rest of the plugin's rules still apply here.
    files: browser,
    rules: {
      "n/no-unsupported-features/node-builtins": "off",
    },
  },

  // React's rules of hooks, for the code that has hooks. The plugin sets a few of its own
  // rules to `warn`; `--max-warnings 0` makes them failures like everything else.
  //
  // `configs.flat` is the flat-config shape; `configs.recommended` beside it is still the
  // eslintrc one, whose `plugins: ["react-hooks"]` array flat config cannot read. The
  // `-latest` variant is the rule set for the newest React, which is the React pinned
  // here – a plugin update may add a rule to it, and ADR 006 takes that trade knowingly.
  {
    ...reactHooks.configs.flat["recommended-latest"],
    files: browser,
  },
  {
    // `.tsx` only, which is where React is. Returning `null` from a component that
    // renders nothing, and holding `null` in a ref before it is attached, are the
    // framework's own vocabulary rather than a choice this code makes.
    files: ["**/*.tsx"],
    rules: {
      "unicorn/no-null": "off",
    },
  },

  // The dependency direction in ADR 002's layout runs one way: an app may import a
  // library, a library may never import an app or a feature module, and no package
  // reaches into another by relative path. A relative path is the form that would
  // resolve and work where it must not, so two rules refuse it: no-restricted-imports
  // any path into apps/ or modules/, and import-x/no-relative-packages any path into
  // another package – which is what catches a module reaching a sibling module, or a
  // library a sibling library, through a path that never names either directory.
  // Reaching by package name instead fails the type check, because a package that is
  // not a declared dependency does not resolve for TypeScript.
  //
  // Applied to apps too, because an app importing another app is the same violation.
  {
    files: ["apps/**/*.{ts,tsx}", "libraries/**/*.{ts,tsx}", "modules/**/*.{ts,tsx}"],
    rules: {
      "import-x/no-relative-packages": "error",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/apps", "**/apps/**", "**/modules", "**/modules/**"],
              message:
                "Dependencies run one way: an app may import a library, and nothing may import an app or a feature module by relative path. Move the shared code into a library instead.",
            },
          ],
        },
      ],
    },
  },

  // Linting the lint configuration itself: spreading untyped plugin configs and keeping
  // the deprecated tseslint.config() cannot satisfy these rules, so they are off for this
  // file only.
  {
    files: ["eslint.config.ts"],
    rules: {
      "@typescript-eslint/no-deprecated": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "import-x/no-named-as-default": "off",
      "import-x/no-named-as-default-member": "off",
      "sonarjs/deprecation": "off",
    },
  },

  // Prettier (disable conflicting rules – MUST BE LAST)
  {
    ...prettier,
    files: ["**/*.{ts,tsx,json,jsonc}"],
  },
)
