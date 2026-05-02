import { Icons, Input } from "@bainder/ui";
import { formatDayLabel } from "../utils/date";

export function DashboardHeader({
  reader,
  query,
  onQuery,
  showSearch,
}: {
  reader: string;
  query: string;
  onQuery: (value: string) => void;
  showSearch: boolean;
}) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="t-label-s text-paper-500">{formatDayLabel()}</div>
        <h1 className="mt-1 font-display text-[40px] font-normal leading-[1.05] tracking-normal text-paper-900 lg:text-[44px]">
          Good evening, {reader}.
        </h1>
      </div>
      {showSearch ? (
        <div className="relative w-full lg:w-80">
          <Input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search across everything..."
            iconEnd={<Icons.Search size={18} color="var(--paper-500)" />}
          />
        </div>
      ) : null}
    </header>
  );
}
