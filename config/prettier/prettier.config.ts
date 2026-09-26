import type { Config } from "prettier"

// Prettier owns formatting across the repository; ESLint leaves style to it
// (eslint-config-prettier, loaded last in eslint.config.ts). Anything not set
// here is Prettier's default.
const config: Config = {
  printWidth: 100,
  proseWrap: "preserve", // keep authored line breaks in Markdown prose
  semi: false,
  xmlWhitespaceSensitivity: "preserve", // reindent XML structure but keep element text verbatim (Android string values)
  plugins: [
    "@prettier/plugin-xml", // format XML (Android manifests, resources)
    "prettier-plugin-curly", // braces on every if/for/while body, even single statements
    "prettier-plugin-organize-imports", // sorted and deduplicated imports
    "prettier-plugin-packagejson", // canonical key order in package.json
  ],
  overrides: [
    {
      // The organize-imports plugin needs vue-tsc to read a single-file component and
      // says so on every run otherwise, so a Vue component is formatted without it
      // rather than pulling in a second TypeScript front-end for the sake of a sort.
      files: "*.vue",
      options: {
        plugins: ["@prettier/plugin-xml", "prettier-plugin-curly", "prettier-plugin-packagejson"],
      },
    },
  ],
}

export default config
