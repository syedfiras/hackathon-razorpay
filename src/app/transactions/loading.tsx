import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-[500px] w-full rounded-xl" />
    </div>
  );
}
