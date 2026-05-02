export function AuthVisual() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-paper-100 px-14 py-14 lg:flex">
      <div className="m-auto max-w-[520px] opacity-50">
        <div className="text-center font-display text-[22px] font-medium leading-tight text-paper-900">
          Chapter 01
        </div>
        <div className="mt-2 text-center font-display text-[24px] font-normal leading-tight text-paper-900">
          The Psychopathology of Everyday Things
        </div>
        <p className="mt-6 font-reading text-[18px] leading-[1.7] text-paper-900">
          Signifiers are the most important addition to the chapter.{" "}
          <mark className="bd-highlight">
            Affordances define what actions are possible. Signifiers specify how people discover
            those possibilities.
          </mark>{" "}
          Signifiers are of far more importance to designers than are affordances.
        </p>
      </div>

      <figure className="absolute bottom-14 left-14 right-14 m-0 rounded-xl bg-paper-50 px-8 py-7 shadow-[var(--sh-lg)]">
        <blockquote className="m-0 font-display text-[22px] font-normal leading-[1.25] tracking-normal text-paper-900">
          "Bainder is the first reader that feels like it's read the book with me."
        </blockquote>
        <figcaption className="mt-4 flex items-center gap-3">
          <span className="h-7 w-7 rounded-full bg-paper-200" />
          <span className="t-body-s text-paper-600">Maya - early reader</span>
        </figcaption>
      </figure>
    </aside>
  );
}
