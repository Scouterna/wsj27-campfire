import type { User } from "@scouterna/wsj27-campfire-utils"

/**
 * A member of the contingent management's admin function, the one the auth service lets
 * impersonate in the test environments. Listed among the targets too, so the picker's
 * stories show the person who opened it left out.
 */
export const admin: User = {
  firstName: "Kalle",
  mark: { isLeader: false },
  memberNo: "1200103",
  name: "Kalle Kvist",
  roleLine: "CMT · Admin",
  roleLineWithUnit: "CMT · Admin",
  roles: [{ kind: "cmt" }, { kind: "admin" }],
}

/**
 * The leaders' and the management's listing rows the impersonation stories read, in the
 * participants service's own basic-level wire shape, because that is what the cache
 * holds.
 */
export const targetRows: readonly unknown[] = [
  {
    member_no: 1_200_101,
    member_type: "Kontingentledning",
    name: "Pernilla Palm",
    roles: ["wsj27:cmt:program:medlem"],
    troop: "",
  },
  {
    member_no: 1_200_102,
    member_type: "Kontingentledning",
    name: "Helena Hägg",
    roles: ["wsj27:cmt:support:halsa"],
    troop: "",
  },
  {
    member_no: 1_200_103,
    member_type: "Kontingentledning",
    name: "Kalle Kvist",
    roles: ["wsj27:cmt:admin:it"],
    troop: "",
  },
  {
    member_no: 1_100_101,
    member_type: "Avdelningsledare",
    name: "Lars Lindberg",
    roles: ["wsj27:al:1"],
    troop: "1",
  },
  {
    member_no: 1_100_201,
    member_type: "Avdelningsledare",
    name: "Åsa Öberg",
    roles: ["wsj27:al:2"],
    troop: "2",
  },
  {
    member_no: 1_100_301,
    member_type: "Avdelningsledare",
    name: "Mohammed Ali",
    roles: ["wsj27:al:12"],
    troop: "12",
  },
  {
    member_no: 1_100_302,
    member_type: "Avdelningsledare",
    name: "Ebba Ek",
    roles: ["wsj27:al"],
    troop: "12",
  },
]
