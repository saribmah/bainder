import { Icons } from "@baindar/ui";

type IconComponent = typeof Icons.BookOpen;

export function ImportHint({ icon: Icon, label }: { icon: IconComponent; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-bd-fg-subtle">
      <Icon size={14} color="var(--bd-fg-subtle)" />
      <span className="t-body-s">{label}</span>
    </div>
  );
}
