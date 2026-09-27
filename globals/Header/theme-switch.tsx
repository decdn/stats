"use client"

import { useSyncExternalStore } from "react"
import { useTheme } from "next-themes"

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
    <label className="flex cursor-pointer items-center gap-2 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
      dark
      <Switch
        checked={mounted && resolvedTheme === "dark"}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
      />
    </label>
  )
}
