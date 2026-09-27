// Both variants stay in the static HTML and the `.dark` class picks one, so
// the theme switch needs no JS and never flashes. Only one carries alt text,
// so screen readers announce "decdn" once.
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
        alt=""
        width={120}
        height={32}
        className="hidden h-8 w-auto dark:block"
      />
    </>
  )
}
