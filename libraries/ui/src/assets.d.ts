// Vite lets a component import its own stylesheet and the library's artwork out of
// assets/, and these declarations tell TypeScript so.
declare module "*.css" {}

declare module "*.svg" {
  /**
   * The address Vite serves the image at.
   */
  const url: string
  export default url
}

interface ImportMeta {
  /**
   * Vite's glob import, in the one shape the library uses: every match loaded eagerly,
   * keyed by its path.
   * @param pattern The files to match, relative to the importing file.
   * @param options How every match is imported.
   * @param options.eager Loaded with the importing file rather than on demand.
   * @param options.import Which of each match's exports to take.
   * @param options.query The query each match is imported with.
   * @returns What each match exports, by its path.
   */
  glob<T>(
    pattern: string,
    options: { readonly eager: true; readonly import: "default"; readonly query: string },
  ): Record<string, T>
}
