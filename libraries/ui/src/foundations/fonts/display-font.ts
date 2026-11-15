import displayFontUrl from "../../../assets/fonts/bravelyscript.otf"

/**
 * Where the display face is served as a font file a program can read whole.
 *
 * The stylesheet is how a screen wears the face; this is for the rare caller that sets
 * type itself – building a document outside the browser's own layout, where no
 * stylesheet reaches. It is the same face in another container, because such a caller
 * reads the outlines itself and the compressed web format is the browser's alone.
 */
export const displayFontFile: string = displayFontUrl
