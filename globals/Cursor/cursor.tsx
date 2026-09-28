// The blinking block that trails loading copy, in the text's own color. It
// echoes the hero's liveness square, which blinks the same way while loading.
export function Cursor() {
  return (
    <span
      aria-hidden="true"
      className="ml-1.5 inline-block size-[0.6em] animate-cursor bg-current"
    />
  )
}
