// A side-effect stylesheet import carries no types of its own, and
// `noUncheckedSideEffectImports` requires every bare import to resolve to
// something. Vite handles the actual loading; this only tells the compiler
// the module exists.
declare module "*.css" {}

// The lightbox is a single-file Vue component, which the compiler cannot read either;
// Vite compiles it, and this only tells the compiler the module exists.
declare module "*.vue" {}
