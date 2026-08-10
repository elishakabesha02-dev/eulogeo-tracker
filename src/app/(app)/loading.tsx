import { Card } from "@/components/ui/card";
import { Skeleton, TableSkeleton } from "@/components/ui/states";

export default function AppLoading() {
  return (
    <>
      <div className="mb-5 space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Card>
        <TableSkeleton />
      </Card>
    </>
  );
}
