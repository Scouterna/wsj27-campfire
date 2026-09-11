package se.scouterna.campfire

/**
 * Configuration read from BuildConfig, whose values come from the product flavor.
 *
 * The address of the web application is a build setting rather than a literal in the
 * source, so the shell can be pointed at another origin without a code change.
 */
object Config {
  val webOrigin: String = BuildConfig.CAMPFIRE_WEB_ORIGIN
}
