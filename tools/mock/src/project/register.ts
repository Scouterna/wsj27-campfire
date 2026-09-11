import { field } from "../json.ts"
import type { Answer, Form, FormSection, FormTab, Participant } from "../types.ts"
import { rolesForParticipant, type CmtDetails } from "./roles.ts"

/**
 * One participant as the project API holds and sends them, after `scoutnet_forms.py` decodes the
 * raw row. The keys are the wire's, in the wire's order.
 */
export interface ParticipantRecord {
  readonly born: string
  /**
   * The contact tab's sections, with the form and tab levels dropped – available at basic.
   */
  readonly contact_info: Readonly<Record<string, Readonly<Record<string, Answer>>>>
  readonly email: string | null
  /**
   * Everything else the form published, nested form, tab, section – available only at full.
   */
  readonly forms_data: Readonly<Record<string, unknown>>
  readonly member_group: string
  readonly member_no: number
  readonly member_type: string
  readonly mobile: string | null
  readonly name: string
  /**
   * The travel package, normalized across the three questions that ask for it.
   */
  readonly participation_type: string
  /**
   * The roles minted for the participant at decode time.
   */
  readonly roles: readonly string[]
  readonly sex: string
  readonly troop: string
}

/**
 * The decoded register, keyed by member number.
 */
export type Register = ReadonlyMap<number, ParticipantRecord>

const memberTypes: Readonly<Record<Participant["role"], string>> = {
  deltagare: "Deltagare",
  ist: "IST",
  kontingentledning: "Kontingentledning",
  ledare: "Avdelningsledare",
}

// The travel packages each member type's own question offers, as the service normalizes their
// options. An answer outside its type's options decodes to nothing.
const participationTypes: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["Avdelningsledare", new Set(["Direktresa", "Rundresa"])],
  ["Deltagare", new Set(["Direktresa", "Rundresa"])],
  ["IST", new Set(["Egen resa", "Rundresa"])],
  ["Kontingentledning", new Set(["Direktresa", "Rundresa"])],
])

// Tabs that leave the template as contact_info rather than forms_data. The split is an access
// one: contact details come with basic access, the rest only with full.
const contactTabs: ReadonlySet<string> = new Set(["Grundläggande information"])

/**
 * Decodes the seeded register the way the service decodes Scoutnet's: the basic block, the roles
 * minted once, and the answers walked through the form template into `contact_info` and
 * `forms_data`.
 * @param participants The raw register.
 * @param forms The form template.
 * @param cmtDetails The CMT roster, read.
 * @returns The register, keyed by member number.
 */
export function decodeRegister(
  participants: readonly Participant[],
  forms: readonly Form[],
  cmtDetails: CmtDetails,
): Register {
  const register = new Map<number, ParticipantRecord>()
  for (const participant of participants) {
    const memberNo = Number(participant.memberNo)
    const memberType = memberTypes[participant.role]
    const troop = troopOf(participant)
    // The service fills every form and keeps what matched, which works because the forms share
    // no question ids. The seed keys its answers by question key, which the forms do share, so
    // only the participant's own form is walked.
    const tabs = forms.find((form) => form.id === participant.formId)?.tabs ?? []
    const { contactInfo, formsData } = splitContact(
      fillTemplate(tabs, participant.answers),
      participant.formId,
    )
    const accessLevel = participant.accessLevel ?? "Ingen"
    register.set(memberNo, {
      name: `${participant.firstName} ${participant.lastName}`,
      member_no: memberNo,
      born: participant.birthDate,
      sex: participant.sex,
      member_group: participant.memberGroup ?? "",
      // eslint-disable-next-line unicorn/no-null -- Scoutnet's missing email is null on the wire
      email: participant.email ?? null,
      // eslint-disable-next-line unicorn/no-null -- a missing mobile number is null on the wire
      mobile: participant.phone ?? null,
      member_type: memberType,
      participation_type: participationTypeOf(
        memberType,
        field(participant.answers, "travel") as Answer | undefined,
      ),
      roles: rolesForParticipant({ accessLevel, memberNo, memberType, troop }, cmtDetails),
      troop,
      contact_info: contactInfo,
      forms_data: formsData,
    })
  }
  return register
}

// The troop the register carries: the unit for a leader or a deltagare. The project API does
// not carry the IST's patrols, and the contingent management has no troop.
function troopOf(participant: Participant): string {
  const isInUnit = participant.role === "deltagare" || participant.role === "ledare"
  return isInUnit && participant.unitNumber !== undefined ? String(participant.unitNumber) : ""
}

function participationTypeOf(memberType: string, answer: Answer | undefined): string {
  const offered = participationTypes.get(memberType)
  return typeof answer === "string" && offered?.has(answer) === true ? answer : ""
}

// One form's tabs filled with a participant's answers, walking the template rather than the
// answers so the template alone decides what appears and in what order. An unanswered question
// is left out, and a section or tab left empty is dropped.
function fillTemplate(
  tabs: readonly FormTab[],
  answers: Readonly<Record<string, Answer>>,
): Map<string, Map<string, Record<string, Answer>>> {
  const filled = new Map<string, Map<string, Record<string, Answer>>>()
  for (const tab of tabs) {
    const sections = new Map<string, Record<string, Answer>>()
    for (const section of tab.sections) {
      const entries = sectionAnswers(section, answers)
      if (entries.size > 0) {
        sections.set(section.title, Object.fromEntries(entries))
      }
    }
    if (sections.size > 0) {
      filled.set(tab.title, sections)
    }
  }
  return filled
}

// A section's answered questions in the template's order. Where two ids share a key they ask the
// same question, and the first one answered wins.
function sectionAnswers(
  section: FormSection,
  answers: Readonly<Record<string, Answer>>,
): Map<string, Answer> {
  const entries = new Map<string, Answer>()
  for (const { key } of section.questions) {
    const value = field(answers, key) as Answer | undefined
    if (!entries.has(key) && value !== undefined && value.length > 0) {
      entries.set(key, value)
    }
  }
  return entries
}

function splitContact(
  filled: ReadonlyMap<string, ReadonlyMap<string, Record<string, Answer>>>,
  formId: string,
): {
  readonly contactInfo: Record<string, Record<string, Answer>>
  readonly formsData: Record<string, unknown>
} {
  const contact = new Map<string, Record<string, Answer>>()
  const kept = new Map<string, Record<string, Record<string, Answer>>>()
  for (const [tab, sections] of filled) {
    if (contactTabs.has(tab)) {
      for (const [title, sectionAnswers] of sections) {
        contact.set(title, { ...contact.get(title), ...sectionAnswers })
      }
    } else {
      kept.set(tab, Object.fromEntries(sections))
    }
  }
  return {
    contactInfo: Object.fromEntries(contact),
    formsData: kept.size > 0 ? { [formId]: Object.fromEntries(kept) } : {},
  }
}
