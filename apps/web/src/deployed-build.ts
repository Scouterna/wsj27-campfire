/**
 * The build a page of the application belongs to, as the page itself names it: the
 * address of its entry script. The bundler puts a hash of the script in that address, so
 * two builds never share one, and a page and the server can be asked the same question.
 *
 * Only a page that says it is Campfire's names a build. Whatever else answers at the
 * application's address – an ingress's error page, a network's sign-in page – names
 * none, so nothing is ever done on its word.
 * @param html A page, as served.
 * @returns The entry script's address, or undefined for a page that is not a built page
 * of the application.
 */
export function buildOf(html: string): string | undefined {
  if (!/<meta\s[^>]*name="campfire-version"/u.test(html)) {
    return undefined
  }
  const entry = /<script\s[^>]*type="module"[^>]*>/u.exec(html)?.[0]
  const address = entry === undefined ? undefined : /\ssrc="([^"]+)"/u.exec(entry)?.[1]
  return address !== undefined && /^\/assets\/[\w.-]+\.js$/u.test(address) ? address : undefined
}
