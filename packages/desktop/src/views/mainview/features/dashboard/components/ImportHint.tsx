import { Icons } from "@bainder/ui";

type IconComponent = typeof Icons.BookOpen;

export function ImportHint({ icon: Icon, label }: { icon: IconComponent; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-paper-600">
      <Icon size={14} color="var(--paper-600)" />
      <span className="t-body-s">{label}</span>
    </div>
  );
}
