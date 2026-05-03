import { NavLink } from "react-router-dom";
import { Icons, Wordmark } from "@bainder/ui";
import { ProfileMenuButton } from "../../profile";
import { UploadButton } from "./UploadControls";

const navItems = [
  { icon: Icons.Home, name: "Home", to: "/dashboard" },
  { icon: Icons.Library, name: "Library", to: "/library", count: 0 },
  { icon: Icons.Sparkles, name: "Conversations", count: 0 },
  { icon: Icons.Highlight, name: "Highlights", to: "/highlights", count: 0 },
  { icon: Icons.Note, name: "Notes" },
  { icon: Icons.Search, name: "Search" },
];

export function DashboardRail({
  totalCount,
  pendingCount,
  readyCount,
  reader,
  uploading,
  onUpload,
}: {
  totalCount: number;
  pendingCount: number;
  readyCount: number;
  reader: string;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const collections = [
    { name: "Processed", dot: "var(--hl-green)", count: readyCount },
    { name: "In progress", dot: "var(--hl-yellow)", count: pendingCount },
    { name: "Book notes", dot: "var(--hl-pink)", count: 0 },
    { name: "Research", dot: "var(--hl-blue)", count: 0 },
  ];
  const nav = navItems.map((item) =>
    item.name === "Library" ? { ...item, count: totalCount } : item,
  );

  return (
    <aside className="hidden w-[230px] shrink-0 flex-col gap-5 border-r border-paper-200 px-[18px] py-6 lg:flex">
      <Wordmark size="md" />
      <UploadButton uploading={uploading} onFile={onUpload} />

      <nav className="flex flex-col gap-0.5" aria-label="Dashboard">
        {nav.map((item) => (
          <RailNavItem key={item.name} item={item} />
        ))}
      </nav>

      <div className="h-px bg-paper-200" />

      <div>
        <div className="t-label-s mb-2.5 px-3 text-paper-500">COLLECTIONS</div>
        <div className="flex flex-col gap-0.5">
          {collections.map((collection) => (
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

function RailNavItem({ item }: { item: (typeof navItems)[number] }) {
  const content = (active: boolean) => (
    <>
      <item.icon size={18} color={active ? "var(--paper-900)" : "var(--paper-600)"} />
      <span className="t-label-m flex-1">{item.name}</span>
      {item.count !== undefined && (
        <span className="font-mono text-[11px] text-paper-500">{item.count}</span>
      )}
    </>
  );

  if ("to" in item && item.to) {
    return (
      <NavLink
        to={item.to}
        className={({ isActive }) =>
          [
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-left no-underline transition-colors",
            isActive ? "bg-paper-100 text-paper-900" : "text-paper-700 hover:bg-paper-100",
          ].join(" ")
        }
      >
        {({ isActive }) => content(isActive)}
      </NavLink>
    );
  }

  return (
    <button
      type="button"
      className="flex items-center gap-2.5 rounded-md border-0 bg-transparent px-3 py-2 text-left text-paper-700 transition-colors hover:bg-paper-100"
    >
      {content(false)}
    </button>
  );
}
