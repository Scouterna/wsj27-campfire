import { addons } from "storybook/manager-api"

import { theme } from "./theme"

// Storybook's own chrome – the sidebar, the toolbar, the panels – in the theme the Docs
// pages share, so the two sites the repository publishes look like one project.
addons.setConfig({ theme })
