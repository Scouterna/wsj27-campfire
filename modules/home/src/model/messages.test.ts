import type { Role } from "@scouterna/wsj27-campfire-utils"
import { describe, expect, it } from "vitest"

import {
  defaultMessageDuration,
  messages,
  parseClosedMessages,
  unreadMessages,
  type Message,
} from "./messages"

const leader: readonly Role[] = [{ kind: "leader", unitNumber: 1 }]
const management: readonly Role[] = [{ kind: "cmt" }, { kind: "health" }]

// A moment every shipped message is showing at, and one every fixture below is.
const launch = new Date("2026-09-20T21:00:00+02:00")
const during = new Date("2026-09-02T12:00:00+02:00")

const forLeaders: Message = {
  audience: ["leader"],
  id: "leaders",
  kind: "welcome",
  paragraphs: ["Till ledare."],
  start: new Date("2026-09-01T12:00:00+02:00"),
  title: "Ledare",
}
const forManagement: Message = {
  audience: ["cmt"],
  id: "management",
  kind: "welcome",
  paragraphs: ["Till lagerledningen."],
  start: new Date("2026-09-01T12:00:00+02:00"),
  title: "Lagerledningen",
}
const forBoth: Message = {
  audience: ["cmt", "leader"],
  id: "both",
  kind: "news",
  paragraphs: ["Till alla."],
  start: new Date("2026-09-01T12:00:00+02:00"),
  title: "Alla",
}
const list = [forLeaders, forManagement, forBoth]

describe("the message list", () => {
  it("opens with a welcome for each audience, and the contact note under it", () => {
    expect(
      unreadMessages(messages, leader, new Set(), launch).map((message) => message.id),
    ).toEqual(["welcome-leader-2026-09", "contact-details-2026-09"])
    expect(
      unreadMessages(messages, management, new Set(), launch).map((message) => message.id),
    ).toEqual(["welcome-cmt-2026-09", "contact-details-2026-09"])
  })

  it("brings a message added later alone to whoever closed the earlier ones", () => {
    const closed = new Set(["welcome-leader-2026-09"])

    expect(unreadMessages(messages, leader, closed, launch).map((message) => message.id)).toEqual([
      "contact-details-2026-09",
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
      expect(message.paragraphs.join(" ").toLocaleLowerCase("sv-SE")).not.toContain("allerg")
    }
  })
})

describe("which messages a reader sees", () => {
  it("shows a reader the messages for their audience, in list order", () => {
    expect(unreadMessages(list, leader, new Set(), during)).toEqual([forLeaders, forBoth])
    expect(unreadMessages(list, management, new Set(), during)).toEqual([forManagement, forBoth])
  })

  it("shows nothing to somebody who holds none of a message's roles", () => {
    expect(unreadMessages(list, [], new Set(), during)).toEqual([])
  })

  it("shows somebody who holds both roles the messages for either", () => {
    expect(unreadMessages(list, [...leader, ...management], new Set(), during)).toEqual(list)
  })

  it("shows nothing when every message for the reader is closed", () => {
    expect(unreadMessages(list, leader, new Set(["leaders", "both"]), during)).toEqual([])
  })

  it("shows a message added later alone to a device that closed the earlier ones", () => {
    expect(unreadMessages(list, leader, new Set(["leaders"]), during)).toEqual([forBoth])
  })

  it("keeps the other audience's message unread on a device where one was closed", () => {
    // A shared device: the leader closed theirs, and the management still has not
    // been told anything.
    expect(unreadMessages(list, management, new Set(["leaders"]), during)).toEqual([
      forManagement,
      forBoth,
    ])
  })

  it("ignores a closed id the list no longer holds", () => {
    expect(unreadMessages([forBoth], leader, new Set(["gone"]), during)).toEqual([forBoth])
  })
})

describe("when a message shows", () => {
  const opens = new Date("2026-09-05T09:00:00+02:00")
  const closes = new Date("2026-09-10T18:00:00+02:00")
  const windowed: Message = { ...forBoth, end: closes, start: opens }
  const start = opens.getTime()
  const end = closes.getTime()

  /**
   * Whether the windowed message shows to a leader at a moment.
   * @param moment The moment, in milliseconds since the epoch.
   * @param closed The ids this device has closed, defaulting to none.
   * @returns True when it is among the unread.
   */
  function isShownAt(moment: number, closed: ReadonlySet<string> = new Set()): boolean {
    return unreadMessages([windowed], leader, closed, new Date(moment)).length > 0
  }

  it("shows from its start up to but not including its end", () => {
    expect(isShownAt(start - 1)).toBe(false)
    expect(isShownAt(start)).toBe(true)
    expect(isShownAt(end - 1)).toBe(true)
    expect(isShownAt(end)).toBe(false)
  })

  it("keeps a closed message out inside its window, and any message out outside it", () => {
    expect(isShownAt(start, new Set([windowed.id]))).toBe(false)
    expect(isShownAt(end, new Set())).toBe(false)
    expect(isShownAt(start - 1, new Set(["other"]))).toBe(false)
  })

  it("ends five days of 24 hours after the start without an end, across a switch", () => {
    // Summer time ends in Sweden on 25 October 2026, so the default end falls an hour
    // earlier on the wall clock than the start did.
    const autumn: Message = { ...forBoth, start: new Date("2026-10-23T12:00:00+02:00") }
    const opens = autumn.start.getTime()

    const at = (moment: number): readonly Message[] =>
      unreadMessages([autumn], leader, new Set(), new Date(moment))
    expect(at(opens + defaultMessageDuration - 1)).toEqual([autumn])
    expect(at(opens + defaultMessageDuration)).toEqual([])
  })

  it("never shows a message whose start or end is an invalid date", () => {
    const brokenStart: Message = { ...forBoth, start: new Date("sometime") }
    const brokenEnd: Message = { ...forBoth, end: new Date("never") }

    expect(unreadMessages([brokenStart, brokenEnd], leader, new Set(), during)).toEqual([])
  })
})

describe("the shipped moments", () => {
  it("gives every message a valid start, and ends each after it starts", () => {
    for (const message of messages) {
      expect(message.start.getTime()).not.toBeNaN()
      if (message.end !== undefined) {
        expect(message.end.getTime()).toBeGreaterThan(message.start.getTime())
      }
    }
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
