/**
 * How ready somebody is for the jamboree's activities – the factors the participants
 * service exports, and the free text that qualifies a no. The form asks more, but the
 * rest never leaves Scoutnet.
 */
export interface Readiness {
  /**
   * Whether they can swim 200 meters.
   */
  readonly swims200m?: boolean
  /**
   * Whether large crowds are comfortable for them.
   */
  readonly comfortableInCrowds?: boolean
  /**
   * What they wrote to qualify a no.
   */
  readonly clarification?: string
}
