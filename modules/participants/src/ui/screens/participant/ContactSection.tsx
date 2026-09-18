import {
  Card,
  ContactCard,
  IconField,
  MailIcon,
  PhoneIcon,
  type ContactCardProps,
} from "@scouterna/wsj27-campfire-ui"
import type { ReactElement } from "react"

import type { ContactDetails, ContactPerson } from "../../../model/ContactDetails"
import { dialablePhoneNumber, formatPhoneNumber } from "../../../model/phone"

export interface ContactSectionProps {
  /**
   * How to reach the person and the people around them.
   */
  readonly contact: ContactDetails
}

/**
 * A registration field as a component value: the empty string the service uses for "not
 * given" becomes an omitted prop, which is the components' own honest missing state.
 * @param value The field as the record carries it.
 * @returns The value, or undefined when there is nothing in it.
 */
function given(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value
}

/**
 * The value and link props for one channel, omitted entirely where the record holds
 * nothing – `IconField` draws its own missing state for an absent value. A number is
 * shown in its display shape and dialed in its bare one.
 * @param value The address or number, where there is one.
 * @param scheme Which scheme the link opens with.
 * @returns The props to spread onto the field.
 */
function channel(value: string | undefined, scheme: "mailto" | "tel"): object {
  if (value === undefined) {
    return {}
  }
  if (scheme === "tel") {
    return { href: `tel:${dialablePhoneNumber(value)}`, value: formatPhoneNumber(value) }
  }
  return { href: `mailto:${value}`, value }
}

/**
 * The overline naming who a contact is – "Närstående 1 · Vårdnadshavare". The relation
 * joins only where the record holds one.
 * @param base What the contact is to the person.
 * @param relation How they are related, where that was given.
 * @returns The overline.
 */
function overline(base: string, relation: string | undefined): string {
  return relation === undefined ? base : `${base} · ${relation}`
}

/**
 * The line under a contact's name, and the one action that reaches them: a call where
 * there is a number, an email otherwise, and no action where the record holds neither.
 * @param person The contact to reach.
 * @returns The detail line and the action, each present only where there is one.
 */
function reachability(person: ContactPerson): Pick<ContactCardProps, "action" | "detail"> {
  const phone = given(person.phone)
  const email = given(person.email)
  const detail = [phone === undefined ? undefined : formatPhoneNumber(phone), email]
    .filter((part) => part !== undefined)
    .join(" · ")
  const action = actionFor(phone, email)

  return {
    ...(action !== undefined && { action }),
    ...(detail !== "" && { detail }),
  }
}

/**
 * The one round action on a contact card: a call where there is a number, an email
 * otherwise. The call leads because a contact named for an emergency is one to reach now.
 * @param phone The number to call them on, where there is one.
 * @param email The address to write to them at, where there is one.
 * @returns The action, or undefined where the record holds neither.
 */
function actionFor(
  phone: string | undefined,
  email: string | undefined,
): ContactCardProps["action"] {
  if (phone !== undefined) {
    return { href: `tel:${dialablePhoneNumber(phone)}`, kind: "call" }
  }
  return email === undefined ? undefined : { href: `mailto:${email}`, kind: "mail" }
}

/**
 * Kontakt: the person's own channels, then the people to reach on their behalf – the
 * emergency contacts first, the primary one leading, then the närstående.
 * @param props How to reach the person and the people around them.
 * @returns The section.
 */
export function ContactSection(props: ContactSectionProps): ReactElement {
  const contact = props.contact

  // The first call first: the primary emergency contact ahead of the secondary.
  const emergency = contact.emergencyContacts.toSorted((left, right) => {
    if (left.rank === right.rank) {
      return 0
    }
    return left.rank === "primary" ? -1 : 1
  })

  return (
    <section className="person-section">
      <h2 className="person-section-heading">Kontakt</h2>

      <Card>
        <div className="person-channels">
          <IconField
            icon={<MailIcon />}
            label="E-post"
            {...channel(given(contact.email), "mailto")}
          />
          <IconField
            icon={<PhoneIcon />}
            label="Mobiltelefon"
            {...channel(given(contact.phone), "tel")}
          />
          {/* Most people gave no second address, so absence hides the field rather than
              reading "Ej angiven" on nearly every record. */}
          {given(contact.alternateEmail) === undefined ? null : (
            <IconField
              icon={<MailIcon />}
              label="Alternativ e-post"
              {...channel(given(contact.alternateEmail), "mailto")}
            />
          )}
        </div>
      </Card>

      {emergency.length + contact.nextOfKin.length === 0 ? null : (
        <div className="person-contacts">
          {emergency.map((person) => (
            <ContactCard
              key={person.rank}
              name={person.name}
              overline={overline(
                person.rank === "primary" ? "Primär nödkontakt" : "Sekundär nödkontakt",
                person.relation,
              )}
              {...reachability(person)}
            />
          ))}
          {contact.nextOfKin.map((person, index) => (
            <ContactCard
              // The index too, because two närstående can share a name and the list
              // never reorders within a render.
              key={`${String(index)}-${person.name}`}
              name={person.name}
              overline={overline(`Närstående ${String(index + 1)}`, person.relation)}
              {...reachability(person)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
