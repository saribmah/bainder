import { useState, type ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { Button, Icons, Wordmark } from "@bainder/ui";
import type { Shelf } from "@bainder/sdk";
import { ProfileMenuButton } from "../../profile";
import { UploadDropTarget } from "./UploadDropTarget";
import { shelfPath } from "../utils/shelf";

type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type NavItem = {
  icon: IconComponent;
  name: string;
  to?: string;
  count?: number;
};

export function AppSidebar({
  totalCount,
  highlightsCount,
  notesCount,
  conversationsCount = 0,
  reader,
  uploading,
  onUpload,
  shelves,
  activeShelfId,
  onCreateShelf,
}: {
  totalCount: number;
  highlightsCount: number;
  notesCount?: number;
  conversationsCount?: number;
  reader: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  shelves?: ReadonlyArray<Shelf> | null;
  activeShelfId?: string | null;
  onCreateShelf?: () => void;
}) {
  const [shelvesOpen, setShelvesOpen] = useState(true);
  const customShelfCount =
    typeof shelves?.length === "number" ? Math.max(shelves.length - 2, 0) : null;

  const items: NavItem[] = [
    { icon: Icons.Home, name: "Home", to: "/dashboard" },
    { icon: Icons.Library, name: "Library", to: "/library", count: totalCount },
    { icon: Icons.Sparkles, name: "Conversations", count: conversationsCount },
    { icon: Icons.Highlight, name: "Highlights", to: "/highlights", count: highlightsCount },
    { icon: Icons.Note, name: "Notes", to: "/notes", count: notesCount },
  ];

  return (
    <aside className="hidden w-[230px] shrink-0 flex-col gap-5 border-r border-paper-200 px-[18px] py-6 lg:flex">
      <Wordmark size="md" />

      <UploadDropTarget uploading={uploading} onFile={onUpload}>
        {({ browse }) => (
          <Button
            size="md"
            iconStart={<Icons.Plus size={16} />}
            onClick={(event) => {
              event.stopPropagation();
              browse();
            }}
            className="w-full justify-start"
          >
            {uploading ? "Uploading..." : "Add to library"}
          </Button>
        )}
      </UploadDropTarget>

      <nav className="flex flex-col gap-0.5" aria-label="Primary">
        {items.map((item) => (
          <SidebarNavItem key={item.name} item={item} />
        ))}
      </nav>

      <div className="h-px bg-paper-200" />

      <div className="min-h-0 flex-1">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setShelvesOpen((open) => !open)}
            aria-expanded={shelvesOpen}
            className="t-label-s flex items-center gap-1.5 rounded-md border-0 bg-transparent px-2 py-1 text-paper-500 hover:text-paper-700"
          >
            <span
              className="inline-flex items-center justify-center transition-transform"
              style={{ transform: shelvesOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
            >
              <Icons.Chevron size={11} color="currentColor" />
            </span>
            SHELVES
            {customShelfCount !== null && ` · ${customShelfCount}`}
          </button>
          {onCreateShelf && (
            <button
              type="button"
              aria-label="Create shelf"
              className="flex h-6 w-6 items-center justify-center rounded-full border-0 bg-transparent text-paper-600 hover:bg-paper-100"
              onClick={onCreateShelf}
            >
              <Icons.Plus size={13} color="currentColor" />
            </button>
          )}
        </div>

        {shelvesOpen && (
          <div className="flex flex-col gap-0.5">
            {(shelves ?? []).map((shelf, index) => (
              <SidebarShelfItem
                key={shelf.id}
                shelf={shelf}
                index={index}
                activeShelfId={activeShelfId}
              />
            ))}
            {shelves === null && (
              <div className="px-3 py-2 text-[13px] text-paper-500">Loading shelves...</div>
            )}
            {shelves && shelves.length <= 2 && onCreateShelf && (
              <button
                type="button"
                className="flex items-center gap-2.5 rounded-md border-0 bg-transparent px-3 py-2 text-left text-wine-700 hover:bg-wine-50"
                onClick={onCreateShelf}
              >
                <Icons.Plus size={13} color="currentColor" />
                <span className="t-body-m text-[13px] font-semibold">New shelf</span>
              </button>
            )}
          </div>
        )}
      </div>

      <ProfileMenuButton reader={reader} />
    </aside>
  );
}

function SidebarNavItem({ item }: { item: NavItem }) {
  const Icon = item.icon;
  const body = (active: boolean) => (
    <>
      <Icon size={18} color={active ? "var(--paper-900)" : "var(--paper-600)"} />
      <span className="t-label-m flex-1">{item.name}</span>
      {item.count !== undefined && (
        <span className="font-mono text-[11px] text-paper-500">{item.count}</span>
      )}
    </>
  );

  if (item.to) {
    return (
      <NavLink
        to={item.to}
        end={item.to === "/library"}
        className={({ isActive }) =>
          [
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-left no-underline transition-colors",
            isActive ? "bg-paper-100 text-paper-900" : "text-paper-700 hover:bg-paper-100",
          ].join(" ")
        }
      >
        {({ isActive }) => body(isActive)}
      </NavLink>
    );
  }

  return (
    <button
      type="button"
      className="flex items-center gap-2.5 rounded-md border-0 bg-transparent px-3 py-2 text-left text-paper-700 transition-colors hover:bg-paper-100"
    >
      {body(false)}
    </button>
  );
}

function SidebarShelfItem({
  shelf,
  index,
  activeShelfId,
}: {
  shelf: Shelf;
  index: number;
  activeShelfId?: string | null;
}) {
  const smart = shelf.kind === "smart";
  return (
    <NavLink
      to={shelfPath(shelf)}
      className={({ isActive }) =>
        [
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-left no-underline transition-colors",
          index === 2 ? "mt-1 border-t border-paper-200 pt-3" : "",
          isActive || activeShelfId === shelf.id
            ? "bg-paper-100 text-paper-900"
            : "text-paper-700 hover:bg-paper-100",
        ].join(" ")
      }
    >
      {({ isActive }) => {
        const active = isActive || activeShelfId === shelf.id;
        return (
          <>
            {smart ? (
              <span className="font-mono text-[9px] text-paper-500">—</span>
            ) : (
              <Icons.Bookmark size={13} color={active ? "var(--wine-700)" : "var(--paper-500)"} />
            )}
            <span
              className={[
                "t-body-m min-w-0 flex-1 truncate text-[13px]",
                active ? "font-semibold" : "",
              ].join(" ")}
            >
              {shelf.name}
            </span>
            <span className="font-mono text-[11px] text-paper-500">{shelf.itemCount}</span>
          </>
        );
      }}
    </NavLink>
  );
}
