export function AuthVisual() {
  return (
    <aside className="relative hidden min-h-screen overflow-hidden bg-bd-surface-raised px-14 py-14 lg:flex">
      <div className="m-auto max-w-[520px] opacity-50">
        <div className="text-center font-display text-[22px] font-medium leading-tight text-bd-fg">
          Chapter 01
        </div>
        <div className="mt-2 text-center font-display text-[24px] font-normal leading-tight text-bd-fg">
          The Psychopathology of Everyday Things
        </div>
        <p className="mt-6 font-reading text-[18px] leading-[1.7] text-bd-fg">
          Signifiers are the most important addition to the chapter.{" "}
          <mark className="bd-highlight">
            Affordances define what actions are possible. Signifiers specify how people discover
            those possibilities.
          </mark>{" "}
          Signifiers are of far more importance to designers than are affordances.
        </p>
      </div>

      <figure className="absolute bottom-14 left-14 right-14 m-0 rounded-xl bg-bd-bg px-8 py-7 shadow-[var(--sh-lg)]">
        <blockquote className="m-0 font-display text-[22px] font-normal leading-[1.25] tracking-normal text-bd-fg">
          "Bainder is the first reader that feels like it's read the book with me."
        </blockquote>
        <figcaption className="mt-4 flex items-center gap-3">
          <span className="h-7 w-7 rounded-full bg-bd-border" />
          <span className="t-body-s text-bd-fg-subtle">Maya - early reader</span>
        </figcaption>
      </figure>
    </aside>
  );
}
