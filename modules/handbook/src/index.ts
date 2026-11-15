/**
 * The handbook module's public surface – the route table the application merges, the
 * table it mounts outside its gate for anyone, and `HandbookOffline`, which the
 * application mounts for whoever may read the handbook, because only the application is
 * there from the start, before any handbook screen. The handbook is read from the CMS
 * and its FAQ from Scouterna's help center, and their pages, chapters, folders, and
 * questions stay inside.
 */

export { handbookRoutes, publicHandbookRoutes } from "./routes"
export { HandbookOffline } from "./ui/HandbookOffline"
