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
