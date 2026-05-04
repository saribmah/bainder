import { NavLink } from "react-router-dom";
import { Icons } from "@baindar/ui";

export function ProfileMenuButton({ reader }: { reader: string }) {
  return (
    <NavLink
      to="/settings"
      className="mt-auto flex items-center gap-2.5 rounded-md border-0 bg-transparent px-3 py-2 text-left text-bd-fg-subtle hover:bg-bd-surface-raised"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bd-surface-raised text-[12px] font-medium uppercase">
        {reader.slice(0, 1)}
      </span>
      <span className="t-body-m min-w-0 flex-1 truncate">{reader}</span>
      <Icons.Settings size={16} color="var(--bd-fg-muted)" />
    </NavLink>
  );
}
