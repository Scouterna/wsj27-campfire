import {
  cmtTheme,
  contingentMark,
  glyphUrl,
  PageTitle,
  unitsReveal,
  unitTheme,
  useIsRevealed,
  useTheme,
  type Theme,
} from "@scouterna/wsj27-campfire-ui"
import { hasAnyRole, useRoles, useUser } from "@scouterna/wsj27-campfire-utils"
import { useRef, useState, type ReactElement } from "react"

import type { Frame } from "../../../model/social/Frame"
import { addedTextsKeyOf } from "../../../model/social/frames"
import type { PlacedText } from "../../../model/social/placement"
import { FrameChoice } from "./FrameChoice"
import { FrameEditor } from "./FrameEditor"
import type { Mark } from "./MarkPicker"
import { SenderPicker } from "./SenderPicker"
import { noFrame, noTexts, untouched } from "./untouched"
import { usePhoto } from "./use-photo"

import "./SocialScreen.css"

/**
 * What the reader has done to each picture, by the frame it is in, with the picture that
 * has none kept under a name of its own.
 */
type PerFrame<T> = ReadonlyMap<string, T>

/**
 * The social media image maker: a photo, one of the contingent's frames or none, and text
 * written on it, and the finished image previewed and downloaded.
 *
 * Nothing leaves the device. The photo is read, drawn, and downloaded in the browser, and
 * no part of it is ever sent anywhere – which matters more here than anywhere else in
 * Campfire, because the photos are mostly of other people's children.
 * @returns The screen.
 */
export function SocialScreen(): ReactElement {
  const roles = useRoles()
  const user = useUser()
  const { error, isReading, onInput, photo } = usePhoto()

  // The management belongs to no unit, so it says who each image is for; everybody else
  // is making something for their own unit and there is nothing to choose.
  const isManagement = hasAnyRole(roles, "cmt")
  const wornTheme = useTheme()
  // Which number wears which animal is the surprise the whole application is built
  // around, so the units are only offered by name once that curtain is open.
  const areUnitsKnown = useIsRevealed(unitsReveal.id)
  const [picked, setPicked] = useState<Mark>("contingent")
  const [contingentColor, setContingentColor] = useState<Theme>()
  const mark: Mark = isManagement ? picked : (user?.unit?.number ?? "contingent")

  // A unit's color and a unit's mark are one fact about it, so naming the unit settles
  // both and there is nothing else to ask. The contingent is the other way round: it is
  // all five colors and none of them, so which one an image wants is a second choice –
  // starting from the management's red, or from whatever the application already wears.
  const startingColor = isManagement ? cmtTheme : wornTheme
  const contingentTheme = contingentColor ?? startingColor
  const theme = mark === "contingent" ? contingentTheme : unitTheme(mark)
  const markUrl = mark === "contingent" ? contingentMark(theme) : glyphUrl(mark)

  const input = useRef<HTMLInputElement>(null)
  const [current, setCurrent] = useState<Frame>()
  // Kept per frame, so trying another and coming back finds the text where it was left.
  const [texts, setTexts] = useState<PerFrame<Readonly<Record<string, string>>>>(new Map())
  const [placed, setPlaced] = useState<PerFrame<readonly PlacedText[]>>(new Map())
  const addedKey = addedTextsKeyOf(current)
  // What is kept for the picture as it is framed now, with none kept under a name of its
  // own.
  const key = current?.id ?? noFrame

  const choose = (): void => {
    input.current?.click()
  }

  return (
    <>
      <PageTitle title="Skapa bild" />
      <input accept="image/*" className="social-input" onChange={onInput} ref={input} type="file" />
      {error === undefined ? null : (
        <p className="social-status" role="status">
          {error}
        </p>
      )}
      <FrameEditor
        choice={
          <FrameChoice
            current={current}
            markUrl={markUrl}
            onPick={setCurrent}
            photo={photo}
            placed={placed}
            texts={texts}
            theme={theme}
          />
        }
        frame={current}
        isReading={isReading}
        markUrl={markUrl}
        onChoosePhoto={choose}
        onPlaced={(next) => {
          setPlaced((all) => new Map(all).set(addedKey, next))
        }}
        onTexts={(next) => {
          setTexts((all) => new Map(all).set(key, next))
        }}
        photo={photo}
        placed={placed.get(addedKey) ?? noTexts}
        {...(isManagement && {
          sender: (
            <SenderPicker
              color={contingentTheme}
              mark={picked}
              onColor={setContingentColor}
              onMark={setPicked}
              showUnits={areUnitsKnown}
            />
          ),
        })}
        texts={texts.get(key) ?? untouched}
        theme={theme}
      />
    </>
  )
}
