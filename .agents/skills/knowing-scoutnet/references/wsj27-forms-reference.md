# WSJ27 Forms Reference

How the WSJ27 project's registration forms in Scoutnet are shaped, how their answers are encoded, and how `wsj27-project-api` decodes them. The answers include special-category personal data – allergies, medication, vaccinations, and mental health – which is why every consumer gates them behind an access level.

## Contents

- [Two forms](#two-forms)
- [How answers are stored](#how-answers-are-stored)
- [The decoding template](#the-decoding-template)
- [Roles, units, and travel](#roles-units-and-travel)
- [Access levels](#access-levels)
- [Drift](#drift)

## Two forms

The project carries one form per broad group of applicants. A form's questions sit in tabs, and a tab's in sections.

- **Leaders and the management team** (`avdelningsledare_kontingentledning`) – basic information and contacts, including emergency contacts to reach instead of next of kin, and a health tab.
- **Participants and IST** (`deltagare_ist`) – a health tab; a tab of WSJ-related information on international experience and prerequisites for activities, such as swimming; and basic information with two next-of-kin contacts.

The health tab on both covers diet and food allergies, other allergies, vaccinations, physical health, mental health, and other questions.

Question ids are unique across a project's forms, so decoding every form against everyone registered finds the one each person filled in, with no table from member type to form.

## How answers are stored

The stored value does not follow the question's declared type:

| What the member did                          | What Scoutnet stores                                                 |
| -------------------------------------------- | -------------------------------------------------------------------- |
| Picked one choice                            | the choice id, as a string                                           |
| Picked several                               | a list of choice-id strings                                          |
| Typed text or a number                       | the raw string                                                       |
| Answered a field linked to their profile     | a JSON string, `{"linked_id": N, "value": "..."}`, whatever the type |
| Saw the question and left it blank           | `null`, `""`, `[]` – or `"1"`, which matches no option               |
| Never saw it, because a gate question hid it | the question id is absent                                            |

- **Present but empty means skipped; absent means never asked.** Only the storage tells the two apart.
- **`"1"` means a radio shown and never touched**, not a choice. Treating it as one reads untouched severity grids as answers.
- **The declared types are lossy** – `choice`, `text`, `number`, and `other_unsupported_by_api`. There is no boolean; a yes-or-no question and a one-to-five scale are both `choice`, told apart only by their options.
- **`default_value` can point at a choice the question does not have**, and tab and section titles are often empty.
- **Some top-level fields are placeholders** that say "Deprecated – use group_registration_info". Use the membership placement instead.
- **`member_no` arrives as a number or a string.** Pin its type once, where the data comes in.

## The decoding template

`wsj27-project-api` decodes against a hand-maintained template, `forms_template.json`. The template maps form, tab, section, and question id to an English camelCase key and the question's Swedish wording. The decoder walks the template, never the raw answers, so a question the template lacks never reaches a client.

- **One key per question.** The same question in both forms shares a key only when its wording is identical; different wording gets different keys.
- **Choices resolve through the question's own options** at decode time. The template holds no options.
- **Unanswered is left out**, never sent as `null`. A section, tab, or form with nothing filled in is dropped too.
- **Where two question ids share a key, the first real answer wins**, so a stale blank from an abandoned applicant type cannot hide a filled one.
- **The basic-information tab goes to `contact_info`, everything else to `forms_data`**, because contact details need only basic access and the rest needs full. Contact details are a snapshot from registration and can differ from the live Scoutnet profile.
- **Left out on purpose** – the staff-only internal tab, questions already in the basic fields, and questions passed on to the host.

## Roles, units, and travel

These come from specific questions and land in the decoded basic fields, not in `forms_data`:

- **The applicant type** – Deltagare, IST, Avdelningsledare, or Kontingentledning – asked by a different question on each form.
- **The unit** (avdelning), as its number. IST and the management team belong to no unit.
- **The travel choice**, asked differently per applicant type and normalized to `Rundresa`, `Direktresa`, or `Egen resa`. The management team is not asked.

The roles minted from these are in the `knowing-wsj27-services` skill.

## Access levels

A question named Accesstyp gives each person one of four access levels:

- **Ingen** – none
- **Intern information** – internal information
- **Hälsa plus intern information** – health and internal information
- **Avdelningsledare** – a unit leader's access

It becomes the `wsj27:access:<level>` role, carried by everyone granted access. The participants service uses it, beside the other roles, to decide who reads what at which level.

## Drift

The data changes between refreshes, and the template has to follow:

- A question, or a whole section, can disappear from a form without notice.
- A new question stays invisible to clients until someone adds it to the template.
- An absent key can become present and `null`, which a default for a missing key does not catch – check for an empty value, not a missing one.
- Scoutnet can stop publishing a form's questions over the API while the form still shows them.
- The Swedish wording has typos, so never match on it.
