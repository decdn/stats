// Both variants stay in the static HTML and the `.dark` class picks one, so
// the theme switch needs no JS and never flashes. Both carry the alt text: the
// hidden one is display: none, out of the accessibility tree, so screen
// readers still announce "decdn" once, in either theme.
export function Wordmark() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/wordmark-light.svg"
        alt="decdn"
        width={120}
        height={32}
        className="h-8 w-auto dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/wordmark-dark.svg"
        alt="decdn"
        width={120}
        height={32}
        className="hidden h-8 w-auto dark:block"
      />
    </>
  )
}
