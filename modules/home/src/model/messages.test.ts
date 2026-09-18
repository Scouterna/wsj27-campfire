import type { Role } from "@scouterna/wsj27-campfire-utils"
import { describe, expect, it } from "vitest"

import { messages, parseClosedMessages, unreadMessages, type Message } from "./messages"

const leader: readonly Role[] = [{ kind: "leader", unitNumber: 1 }]
const management: readonly Role[] = [{ kind: "cmt" }, { kind: "health" }]

const forLeaders: Message = {
  audience: ["leader"],
  id: "leaders",
  text: "Till ledare.",
  title: "Ledare",
}
const forManagement: Message = {
  audience: ["cmt"],
  id: "management",
  text: "Till lagerledningen.",
  title: "Lagerledningen",
}
const forBoth: Message = {
  audience: ["cmt", "leader"],
  id: "both",
  text: "Till alla.",
  title: "Alla",
}
const list = [forLeaders, forManagement, forBoth]

describe("the message list", () => {
  it("opens with a welcome for each audience", () => {
    expect(unreadMessages(messages, leader, new Set()).map((message) => message.id)).toEqual([
      "welcome-leader-2026-09",
    ])
    expect(unreadMessages(messages, management, new Set()).map((message) => message.id)).toEqual([
      "welcome-cmt-2026-09",
    ])
  })

  it("gives every message an id of its own, and somebody to read it", () => {
    const ids = messages.map((message) => message.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(messages.every((message) => message.audience.length > 0)).toBe(true)
  })

  it("never repeats the page's own välkommen in a title", () => {
    // The start screen's title already says it, right above the first message.
    for (const message of messages) {
      expect(message.title.toLocaleLowerCase("sv-SE")).not.toContain("välkommen")
    }
  })

  it("tells the management nothing about allergies", () => {
    // Most of the management holds no health grant and reads no health answers, so a
    // message promising them would promise what the screen then withholds.
    const managementMessages = messages.filter((message) => message.audience.includes("cmt"))

    expect(managementMessages.length).toBeGreaterThan(0)
    for (const message of managementMessages) {
      expect(message.text.toLocaleLowerCase("sv-SE")).not.toContain("allerg")
    }
  })
})

describe("which messages a reader sees", () => {
  it("shows a reader the messages for their audience, in list order", () => {
    expect(unreadMessages(list, leader, new Set())).toEqual([forLeaders, forBoth])
    expect(unreadMessages(list, management, new Set())).toEqual([forManagement, forBoth])
  })

  it("shows nothing to somebody who holds none of a message's roles", () => {
    expect(unreadMessages(list, [], new Set())).toEqual([])
  })

  it("shows somebody who holds both roles the messages for either", () => {
    expect(unreadMessages(list, [...leader, ...management], new Set())).toEqual(list)
  })

  it("shows nothing when every message for the reader is closed", () => {
    expect(unreadMessages(list, leader, new Set(["leaders", "both"]))).toEqual([])
  })

  it("shows a message added later alone to a device that closed the earlier ones", () => {
    expect(unreadMessages(list, leader, new Set(["leaders"]))).toEqual([forBoth])
  })

  it("keeps the other audience's message unread on a device where one was closed", () => {
    // A shared device: the leader closed theirs, and the management still has not
    // been told anything.
    expect(unreadMessages(list, management, new Set(["leaders"]))).toEqual([forManagement, forBoth])
  })

  it("ignores a closed id the list no longer holds", () => {
    expect(unreadMessages([forBoth], leader, new Set(["gone"]))).toEqual([forBoth])
  })
})

describe("reading the closed ids from storage", () => {
  it("reads a stored array of ids", () => {
    expect([...parseClosedMessages('["welcome-leader-2026-09","later"]')]).toEqual([
      "welcome-leader-2026-09",
      "later",
    ])
  })

  it("reads nothing from a missing or an empty value", () => {
    expect(parseClosedMessages(undefined).size).toBe(0)
    expect(parseClosedMessages("").size).toBe(0)
  })

  it("reads nothing from broken JSON or a foreign shape, and never throws", () => {
    expect(parseClosedMessages("{not json").size).toBe(0)
    expect(parseClosedMessages('{"id":"welcome-leader-2026-09"}').size).toBe(0)
    expect(parseClosedMessages("42").size).toBe(0)
    expect(parseClosedMessages("null").size).toBe(0)
  })

  it("keeps only the strings in a mixed array", () => {
    expect([...parseClosedMessages('["a", 1, null, {"id":"x"}, "b"]')]).toEqual(["a", "b"])
  })
})
