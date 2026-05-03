export function FaintBook({
  title,
  className,
  tone = "var(--hl-blue)",
}: {
  title: string;
  className: string;
  tone?: string;
}) {
  return (
    <div
      className={`absolute top-0 flex h-[92px] w-[66px] items-end rounded p-2 text-left font-display text-[10px] font-medium leading-tight text-bd-fg opacity-40 shadow-sm ${className}`}
      style={{ background: tone }}
    >
      {title}
    </div>
  );
}
