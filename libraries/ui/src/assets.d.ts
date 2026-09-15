// A component may import its own stylesheet, and the library's artwork out of assets/ –
// Vite's behavior, told to TypeScript.
declare module "*.css" {}

declare module "*.svg" {
  /**
   * The address Vite serves the image at.
   */
  const url: string
  export default url
}
