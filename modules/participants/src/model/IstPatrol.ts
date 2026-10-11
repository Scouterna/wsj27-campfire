/**
 * One of the IST's patrols. The patrols are numbered in the same series as the units, so
 * patrol 7 and unit 7 are two different groups.
 */
export interface IstPatrol {
  /**
   * What the patrol is called – "Tordyvel". Absent for a number the contingent has not
   * named.
   */
  readonly name?: string
  /**
   * The patrol's number.
   */
  readonly number: number
}

// The patrols' names, kept beside the Discord server's configuration and copied here,
// because they are the contingent's own and change only when the patrols do.
const istPatrolNames: ReadonlyMap<number, string> = new Map([
  [1, "Ekoxe"],
  [2, "Läderbagge"],
  [3, "Guldbagge"],
  [4, "Ädelguldbagge"],
  [5, "Majbagge"],
  [6, "Junibagge"],
  [7, "Tordyvel"],
  [8, "Bokoxe"],
  [9, "Myskbock"],
  [10, "Timmerman"],
  [11, "Taggbock"],
  [12, "Raggbock"],
  [13, "Husbock"],
  [14, "Blombock"],
  [15, "Reliktbock"],
  [16, "Getingbock"],
  [17, "Granbarkborre"],
  [18, "Märgborre"],
  [19, "Almsplintborre"],
  [20, "Snytbagge"],
  [21, "Äppleblomvivel"],
  [22, "Jordgubbsvivel"],
  [23, "Kornvivel"],
  [24, "Nötvivel"],
  [25, "Liljebagge"],
  [26, "Sparrisbagge"],
  [27, "Rapsbagge"],
  [28, "Coloradobagge"],
  [29, "Skogsandjägare"],
  [30, "Läderlöpare"],
  [31, "Trädgårdslöpare"],
  [32, "Bombarderbagge"],
  [33, "Dykare"],
  [34, "Dödgrävare"],
  [35, "Fläskänger"],
  [36, "Lysmask"],
  [37, "Oljebagge"],
  [38, "Cinnoberbagge"],
  [39, "Kardinalbagge"],
  [40, "Mjölbagge"],
  [41, "Brödbagge"],
  [42, "Trägnagare"],
  [43, "Skuggbagge"],
  [44, "Blombagge"],
])

/**
 * The IST patrol with a given number, named when the contingent names it.
 * @param number The patrol's number.
 * @returns The patrol.
 */
export function istPatrolNumbered(number: number): IstPatrol {
  const name = istPatrolNames.get(number)
  return name === undefined ? { number } : { name, number }
}
