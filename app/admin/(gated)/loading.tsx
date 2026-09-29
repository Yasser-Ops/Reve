import { Skeleton } from '@/components/ui/skeleton';

export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
