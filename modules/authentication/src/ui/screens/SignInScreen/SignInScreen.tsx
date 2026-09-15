import { Button, Logo } from "@scouterna/wsj27-campfire-ui"
import { useState, type ReactElement } from "react"

import { signInUrl } from "../../../data/auth"

import "./SignInScreen.css"

/**
 * The sign-in screen: the contingent's mark on a colored hero, the headline, the pitch,
 * and the one button. The hero, the title, and the action read the theme's tokens, so the
 * screen greets a returning visitor in their own unit's color before anyone has signed
 * in. Pressing the button leaves the page entirely – ScoutID owns the credentials, and
 * this screen has no field to type one into – so the pending state only has to survive
 * until the navigation takes.
 *
 * @returns The screen.
 */
export function SignInScreen(): ReactElement {
  const [pending, setPending] = useState(false)

  function startSignIn(): void {
    setPending(true)
    // The address it started from, so sign-in returns the visitor to the page they asked
    // for rather than to the front door.
    location.assign(signInUrl(location.href))
  }

  return (
    <div className="sign-in">
      <div className="sign-in-hero">
        <Logo />
      </div>
      <div className="sign-in-body">
        <div className="sign-in-text">
          <h1 className="sign-in-title">
            Äventyret
            <br />
            börjar här
          </h1>
          <p className="sign-in-pitch">
            Kontingentens verktyg för ledare och kontingentledningen – allt ni behöver före, under
            och efter resan.
          </p>
        </div>
        <div className="sign-in-action">
          <Button
            disabled={pending}
            label={pending ? "Loggar in…" : "Logga in med ScoutID"}
            onPress={startSignIn}
          />
        </div>
      </div>
    </div>
  )
}
