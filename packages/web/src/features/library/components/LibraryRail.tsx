import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { Button, Icons, Wordmark } from "@bainder/ui";
import { ProfileMenuButton } from "../../profile";
import { UploadDropTarget } from "./UploadDropTarget";

type RailItem = {
  icon: ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  name: string;
  to: string;
  count?: number;
};

export function LibraryRail({
  totalCount,
  highlightsCount,
  reader,
  uploading,
  onUpload,
}: {
  totalCount: number;
  highlightsCount: number;
  reader: string;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const items: RailItem[] = [
    { icon: Icons.Home, name: "Home", to: "/dashboard" },
    { icon: Icons.Library, name: "Library", to: "/library", count: totalCount },
    { icon: Icons.Highlight, name: "Highlights", to: "/highlights", count: highlightsCount },
    { icon: Icons.Settings, name: "Settings", to: "/settings" },
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

      <nav className="flex flex-col gap-0.5" aria-label="Library">
        {items.map((item) => (
          <NavLink
            key={item.name}
            to={item.to}
            end={item.to === "/library"}
            className={({ isActive }) =>
              [
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-left no-underline transition-colors",
                isActive ? "bg-paper-100 text-paper-900" : "text-paper-700 hover:bg-paper-100",
              ].join(" ")
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={18} color={isActive ? "var(--paper-900)" : "var(--paper-600)"} />
                <span className="t-label-m flex-1">{item.name}</span>
                {item.count !== undefined && (
                  <span className="font-mono text-[11px] text-paper-500">{item.count}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="h-px bg-paper-200" />

      <div>
        <div className="t-label-s mb-2.5 px-3 text-paper-500">Collections</div>
        <div className="flex flex-col gap-0.5">
          {[
            { name: "Processed", dot: "var(--hl-green)", count: totalCount },
            { name: "In progress", dot: "var(--hl-yellow)", count: 0 },
            { name: "Book notes", dot: "var(--hl-pink)", count: highlightsCount },
          ].map((collection) => (
            <div key={collection.name} className="flex items-center gap-2.5 rounded-md px-3 py-2">
              <span className="h-2 w-2 rounded-full" style={{ background: collection.dot }} />
              <span className="t-body-m min-w-0 flex-1 truncate text-paper-700">
                {collection.name}
              </span>
              <span className="font-mono text-[11px] text-paper-500">{collection.count}</span>
            </div>
          ))}
        </div>
      </div>

      <ProfileMenuButton reader={reader} />
    </aside>
  );
}
