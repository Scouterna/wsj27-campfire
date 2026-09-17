import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState, type ReactElement } from "react"

import { NavigationBar } from "../navigationbar/NavigationBar"
import { PageTitle, usePageTitle } from "./PageTitle"

const meta: Meta<typeof PageTitle> = {
  title: "Components/PageTitle",
  component: PageTitle,
}

export default meta

type Story = StoryObj<typeof PageTitle>

/**
 * The chrome, as the application draws it: the bar reads whatever the page declared.
 * The story supplies a stand-in name for the moment nothing is declared – in the
 * application every page declares one.
 * @param props The page shown under the bar.
 * @param props.children The page shown under the bar.
 * @returns The bar, the page, and a readout of the declared title.
 */
function Chrome(props: { readonly children: ReactElement }): ReactElement {
  const declared = usePageTitle()

  return (
    <div className="story-stack">
      <NavigationBar title={declared ?? "Deltagare"} />
      {props.children}
      <span className="story-readout">
        Deklarerad titel: {declared ?? "ingen – reservtiteln visas"}
      </span>
    </div>
  )
}

/**
 * A page declares its own name by rendering `PageTitle` – anywhere below the chrome –
 * and the bar picks it up.
 */
export const Declared: Story = {
  render: (): ReactElement => (
    <Chrome>
      <div>
        <PageTitle title="Anna Björk" />
        <p className="story-filler">Sidans innehåll, med personens namn i baren ovanför.</p>
      </div>
    </Chrome>
  ),
}

/**
 * The declaration is withdrawn when the page unmounts: toggle the page and watch the
 * bar fall back.
 */
export const Withdrawn: Story = {
  render: function WithdrawnStory(): ReactElement {
    const [shown, setShown] = useState(true)

    return (
      <Chrome>
        <div className="story-stack">
          {shown ? <PageTitle title="Anna Björk" /> : null}
          <button
            type="button"
            onClick={() => {
              setShown((value) => !value)
            }}
          >
            {shown ? "Lämna sidan" : "Öppna sidan igen"}
          </button>
        </div>
      </Chrome>
    )
  },
}
