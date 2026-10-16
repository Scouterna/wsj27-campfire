import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"

import type { Frame } from "../../../model/social/Frame"
import { addedTextsKeyOf, frames } from "../../../model/social/frames"
import type { PlacedText } from "../../../model/social/placement"
import { storyGlyph, storyPhoto } from "../../storybook/photo"
import { FrameChoice } from "./FrameChoice"
import { FrameEditor } from "./FrameEditor"

/**
 * The stand-in photo, decoded the way the screen decodes a picked one.
 * @returns The photo, under the name the story takes it by.
 */
async function loadPhoto(): Promise<{ photo: ImageBitmap }> {
  const image = new Image()
  image.src = storyPhoto
  await image.decode()
  return { photo: await createImageBitmap(image) }
}

/**
 * What a story of the editor starts with.
 */
interface HeldEditorProps {
  /**
   * The frame chosen when the story opens, or undefined for none.
   */
  readonly frame: Frame | undefined
  /**
   * The photo in it, or undefined for none.
   */
  readonly photo: ImageBitmap | undefined
}

/**
 * The editor with its frame and its texts held in the story, the way the screen
 * holds them, so choosing, typing, and dragging work in the catalog as in the application.
 * @param props The frame and the photo it starts with.
 * @returns The editor.
 */
function HeldEditor(props: HeldEditorProps): ReactElement {
  const [current, setCurrent] = useState(props.frame)
  const [texts, setTexts] = useState<Readonly<Record<string, string>>>({})
  const [placed, setPlaced] = useState<readonly PlacedText[]>([
    {
      color: "white",
      id: "text-1",
      placement: { angle: 0, x: 0.5, y: 0.45 },
      text: "Hej från\nBjörnen!",
    },
  ])
  return (
    <FrameEditor
      choice={
        <FrameChoice
          current={current}
          markUrl={storyGlyph}
          onPick={setCurrent}
          photo={props.photo}
          placed={new Map([[addedTextsKeyOf(current), placed]])}
          texts={new Map()}
          theme="yellow"
        />
      }
      frame={current}
      isReading={false}
      markUrl={storyGlyph}
      onChoosePhoto={() => {
        // A story has no photo picker to open.
      }}
      onPlaced={setPlaced}
      onTexts={setTexts}
      photo={props.photo}
      placed={placed}
      texts={texts}
      theme="yellow"
    />
  )
}

const meta: Meta<typeof HeldEditor> = {
  title: "Modules/Material/Social/FrameEditor",
  component: HeldEditor,
  loaders: [loadPhoto],
  render: (args, { loaded }) => (
    <HeldEditor {...args} photo={(loaded as { photo: ImageBitmap }).photo} />
  ),
}

export default meta

type Story = StoryObj<typeof HeldEditor>

/**
 * A photo with no frame at all, and a text added on it.
 */
export const NoFrame: Story = {
  args: { frame: undefined },
}

/**
 * The photo in the primary frame, with a text added on it, to drag, size, turn, and add
 * more to.
 */
export const Primarram: Story = {
  args: { frame: frames[0] },
}

/**
 * The photo in a ribbon, with a field along each strip.
 */
export const Strykningar: Story = {
  args: { frame: frames.find((frame) => frame.id === "strykningar") },
}
