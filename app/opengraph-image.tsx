import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"

// The link-preview card, rendered once at build time into out/. Laid out like
// decdn.org's card: the wordmark centered on white, with the page's name in
// the type-micro role (uppercase, 0.2em tracking) under it.
export const alt = "decdn network status"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
// output: "export" needs route handlers, this one included, marked static.
export const dynamic = "force-static"

// The SVG bakes in its own underscore color (#0F9D6A), so none is set here.
const wordmark = await readFile(
  join(process.cwd(), "public/wordmark-light.svg"),
  "base64"
)

export default function Image() {
  return new ImageResponse(
    // Satori can't read CSS variables: these are the light theme's
    // --background (#fff) and --muted-foreground (#737373).
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        background: "#fff",
      }}
    >
      <img
        src={`data:image/svg+xml;base64,${wordmark}`}
        width={756}
        height={202}
        alt=""
      />
      <div
        style={{
          fontSize: 36,
          letterSpacing: "0.2em",
          // the tracking trails the last letter: pad it back to center
          paddingLeft: "0.2em",
          textTransform: "uppercase",
          color: "#737373",
        }}
      >
        network status
      </div>
    </div>,
    size
  )
}
