import { ChatIcon, PlusIcon, type OverflowMenuItem } from "@scouterna/wsj27-campfire-ui"

/**
 * What the cases section offers on a person's own screen: every case about them, and
 * opening a new one with them already chosen.
 * @param memberNo The person, by member number.
 * @returns The menu entries, for the application to place in the person's menu.
 */
export function casesPersonMenu(memberNo: string): readonly OverflowMenuItem[] {
  return [
    {
      icon: <ChatIcon size={20} />,
      label: "Visa ärenden",
      link: { params: { memberNo }, to: "/cases/person/$memberNo" },
    },
    {
      icon: <PlusIcon size={20} />,
      label: "Nytt ärende",
      link: { params: { memberNo }, to: "/cases/new/$memberNo" },
    },
  ]
}
