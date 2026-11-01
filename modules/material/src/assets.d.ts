// The module imports its own frame artwork out of assets/ – Vite's behavior, told to
// TypeScript. `libraries/ui` declares the same for its own `.svg` and `.css`; a package
// that imports an asset type declares it, rather than relying on another package's
// declaration that could move.
declare module "*.svg" {
  /**
   * The address Vite serves the image at.
   */
  const url: string
  export default url
}
