// A worker bundled on its own and imported by address – Vite's behavior, told to
// TypeScript.
declare module "*?worker&url" {
  /**
   * The address Vite serves the bundled worker at.
   */
  const url: string
  export default url
}
