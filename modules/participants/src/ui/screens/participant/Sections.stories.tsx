import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactElement, ReactNode } from "react"

import type { Experience } from "../../../model/Experience"
import type { LanguageSkill } from "../../../model/LanguageSkill"
import type { Readiness } from "../../../model/Readiness"
import { ContactSection } from "./ContactSection"
import { DietSection } from "./DietSection"
import { ExperienceSection } from "./ExperienceSection"
import { complete, sparse, withoutHealth } from "./fixtures"
import { HealthSection } from "./HealthSection"
import { LanguagesSection } from "./LanguagesSection"
import { ProfileSection } from "./ProfileSection"
import { ReadinessSection } from "./ReadinessSection"
import { VaccinationsSection } from "./VaccinationsSection"

import "./ParticipantScreen.css"

/**
 * The sections one at a time, each inside the `.person` frame the screen gives them – the
 * container the wide pairings query against.
 */
const meta: Meta = {
  title: "Modules/Participants/Components/Sections",
  parameters: { layout: "fullscreen" },
}

export default meta

function Person(props: { readonly children: ReactNode }): ReactElement {
  return (
    <div className="story-screen">
      <div className="story-screen-content">
        <div className="person">{props.children}</div>
      </div>
    </div>
  )
}

// The record's own health, which every health story reads – resolved once here, since
// the fixtures type it as optional and every story would otherwise unwrap it itself.
const health = complete.health ?? sparse.health
const allClear = sparse.health

const readyForEverything: Readiness = { swims200m: true, comfortableInCrowds: true }

const languages: readonly LanguageSkill[] = complete.languages ?? []

const experience: Experience = {
  internationalScouting: { has: false },
  independentTravel: { has: true, details: "Pendlar själv till skolan med buss och tåg." },
}

/**
 * Profil: the badge, the kind of registration, where it places the person, and the
 * registration facts – with and without a travel package on record.
 */
export const Profile: StoryObj = {
  render: (): ReactElement => (
    <Person>
      <ProfileSection participant={complete} />
      <ProfileSection participant={sparse} />
    </Person>
  ),
}

/**
 * Kontakt: the person's own channels, then the people to reach on their behalf – and the
 * same section for somebody who left nearly all of it blank.
 */
export const Contact: StoryObj = {
  render: (): ReactElement => (
    <Person>
      <ContactSection contact={complete.contact} />
      <ContactSection contact={sparse.contact} />
    </Person>
  ),
}

/**
 * Kost och allergier: a diet chip, the graded allergens, and the free texts – or the
 * all-clear chips where there is nothing to flag.
 */
export const Diet: StoryObj = {
  render: (): ReactElement => (
    <Person>
      {health === undefined ? null : <DietSection health={health} />}
      {allClear === undefined ? null : <DietSection health={allClear} />}
    </Person>
  ),
}

/**
 * Hälsa: the declared facts as rows and the catch-all notes as callouts, or the all-clear
 * chip on its own.
 */
export const Health: StoryObj = {
  render: (): ReactElement => (
    <Person>
      <HealthSection health={complete.health} notes={complete.notes} />
      <HealthSection health={sparse.health} notes={sparse.notes} />
    </Person>
  ),
}

/**
 * Aktivitetsberedskap: the swim and crowd answers as tiles, and the clarification under
 * them.
 */
export const ReadinessCard: StoryObj = {
  name: "Readiness",
  render: (): ReactElement => (
    <Person>
      <ReadinessSection readiness={readyForEverything} />
      {complete.readiness === undefined ? null : (
        <ReadinessSection readiness={complete.readiness} />
      )}
    </Person>
  ),
}

/**
 * Vaccinationer: the childhood program and the two boosters, in every state.
 */
export const Vaccinations: StoryObj = {
  render: (): ReactElement => (
    <Person>
      {health === undefined ? null : <VaccinationsSection vaccinations={health.vaccinations} />}
      {allClear === undefined ? null : <VaccinationsSection vaccinations={allClear.vaccinations} />}
    </Person>
  ),
}

/**
 * Språk: each language as a pill with its proficiency. Nothing fills this section from the
 * participants service today, so the story is where it is kept honest.
 */
export const Languages: StoryObj = {
  render: (): ReactElement => (
    <Person>
      <LanguagesSection languages={languages} />
    </Person>
  ),
}

/**
 * Erfarenhet: the two yes-or-no facts, each with whatever was written about it.
 */
export const ExperienceCard: StoryObj = {
  name: "Experience",
  render: (): ReactElement => (
    <Person>
      {complete.experience === undefined ? null : (
        <ExperienceSection experience={complete.experience} />
      )}
      <ExperienceSection experience={experience} />
    </Person>
  ),
}

/**
 * A record read without health access: only the sections the basic level fills, and no
 * caveat anywhere about the ones it does not.
 */
export const WithoutHealth: StoryObj = {
  render: (): ReactElement => (
    <Person>
      <ProfileSection participant={withoutHealth} />
      <ContactSection contact={withoutHealth.contact} />
    </Person>
  ),
}
