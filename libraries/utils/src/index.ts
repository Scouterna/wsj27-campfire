/**
 * The utilities more than one package needs: the small, pure, dependency-free helpers
 * that would otherwise be copied.
 *
 * The bar for adding something is that a second package already wants it. A helper with
 * one caller belongs beside that caller, where it can change without a release.
 */

export { stringOrFallback } from "./string/string"
