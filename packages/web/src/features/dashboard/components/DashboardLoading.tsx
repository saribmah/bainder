import { Skeleton } from "@bainder/ui";

export function DashboardLoading() {
  return (
    <div className="flex flex-col gap-7">
      <Skeleton height={72} className="rounded-xl" />
      <div className="grid gap-3 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} height={126} className="rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} height={248} className="rounded-lg" />
        ))}
      </div>
    </div>
  );
}
