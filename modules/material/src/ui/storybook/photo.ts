/**
 * A stand-in photo for the stories: a wide gradient, drawn as a data address so nothing
 * in the catalog reaches a network and the previews still have something to show.
 */
export const storyPhoto =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90">
       <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
         <stop offset="0" stop-color="#2d6a8f"/><stop offset="1" stop-color="#7fb069"/>
       </linearGradient></defs>
       <rect width="160" height="90" fill="url(#g)"/>
       <circle cx="44" cy="40" r="16" fill="#ffffff" opacity="0.85"/>
       <circle cx="112" cy="56" r="22" fill="#ffffff" opacity="0.6"/>
     </svg>`,
  )

/**
 * A stand-in unit glyph, in the wide shape the real ones are drawn in. The catalog never
 * loads a unit's own mark: those are runtime data the application fetches, and a story
 * that reached for one would be reaching for the network.
 */
export const storyGlyph =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 50">
       <path fill="#ffffff" d="M10 34c0-9 7-16 16-16h14c9 0 16 7 16 16v3h-8v-3a8 8 0 0 0-8-8H26a8 8 0 0 0-8 8v3h-8zM30 12a6 6 0 1 1 12 0 6 6 0 0 1-12 0z"/>
     </svg>`,
  )
