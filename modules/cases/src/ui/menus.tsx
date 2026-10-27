import { ChatIcon, PlusIcon, type OverflowMenuItem } from "@scouterna/wsj27-campfire-ui"

/**
 * What the cases section offers on a person's own screen: every case about them, and
 * opening a new one with them already chosen where the reader may open cases.
 * @param memberNo The person, by member number.
 * @param canOpen Whether the reader may open a case, as `useCasesAccess` says.
 * @returns The menu entries, for the application to place in the person's menu.
 */
export function casesPersonMenu(memberNo: string, canOpen: boolean): readonly OverflowMenuItem[] {
  const all: readonly OverflowMenuItem[] = [
    {
      icon: <ChatIcon size={20} />,
      label: "Visa ärenden",
      link: { params: { memberNo }, to: "/cases/person/$memberNo" },
    },
  ]
  return canOpen
    ? [
        ...all,
        {
          icon: <PlusIcon size={20} />,
          label: "Nytt ärende",
          link: { params: { memberNo }, to: "/cases/new/$memberNo" },
        },
      ]
    : all
}

/**
 * What the cases section offers on a unit's own screen: every case about it, as a whole or
 * about anyone in it, and opening a new one about the unit as a whole where the reader
 * may open cases.
 * @param unitNumber The unit, by number.
 * @param canOpen Whether the reader may open a case, as `useCasesAccess` says.
 * @returns The menu entries, for the application to place in the unit's menu.
 */
export function casesUnitMenu(unitNumber: number, canOpen: boolean): readonly OverflowMenuItem[] {
  const unit = { unitNumber: String(unitNumber) }
  const all: readonly OverflowMenuItem[] = [
    {
      icon: <ChatIcon size={20} />,
      label: "Visa ärenden",
      link: { params: unit, to: "/cases/unit/$unitNumber" },
    },
  ]
  return canOpen
    ? [
        ...all,
        {
          icon: <PlusIcon size={20} />,
          label: "Nytt ärende",
          link: { params: unit, to: "/cases/new/unit/$unitNumber" },
        },
      ]
    : all
}
