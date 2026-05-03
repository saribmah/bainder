export function SectionHeading({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="m-0 font-display text-[22px] font-medium leading-tight tracking-normal text-bd-fg">
        {title}
      </h2>
      <span className="t-body-m text-bd-fg-muted">{meta}</span>
    </div>
  );
}
