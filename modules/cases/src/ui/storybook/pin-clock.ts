/**
 * The moment the stories are told at – late on a day of the jamboree, after the
 * fixtures' latest change, so which cases wait and how long ago each changed read the
 * same whenever the catalog is opened.
 */
const storyMoment = "2027-08-03T17:30:00+02:00"

/**
 * Stops the clock at the stories' moment, for a story's `beforeEach`. Only the current
 * moment is pinned – a date built from a value is built as ever – and the real clock is
 * back once the story is left.
 * @returns What puts the real clock back.
 */
export function pinClock(): () => void {
  const real = Date
  const pinned = new real(storyMoment).getTime()
  // eslint-disable-next-line unicorn/no-global-object-property-assignment -- every reader of the clock calls the global, so the global is what is pinned
  globalThis.Date = new Proxy(real, {
    construct: (target, args): object =>
      args.length === 0 ? new target(pinned) : (Reflect.construct(target, args) as object),
    get: (target, key, receiver): unknown =>
      key === "now" ? () => pinned : Reflect.get(target, key, receiver),
  })
  return () => {
    // eslint-disable-next-line unicorn/no-global-object-property-assignment -- puts back what the pin replaced
    globalThis.Date = real
  }
}
