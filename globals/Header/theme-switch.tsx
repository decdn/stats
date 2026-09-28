"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"

import { switchTheme } from "@/components/theme-provider"
import { Switch } from "@/components/ui/switch"

const subscribe = () => () => {}

export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme()
  // The theme is only known in the browser; render unchecked until hydrated
  // so the static HTML and the first client render agree.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )

  return (
    <label className="flex cursor-pointer items-center gap-2 type-micro">
      <span aria-hidden>light</span>
      <Switch
        aria-label="dark mode"
        checked={mounted && resolvedTheme === "dark"}
        onCheckedChange={(checked) =>
          switchTheme(() => setTheme(checked ? "dark" : "light"))
        }
      />
      <span aria-hidden>dark</span>
    </label>
  )
}
