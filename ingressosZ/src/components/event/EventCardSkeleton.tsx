import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function EventCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden flex flex-col bg-card">
      <div className="relative h-48 w-full">
        <Skeleton className="h-full w-full" />
      </div>
      <CardHeader className="p-4 space-y-2">
        <div className="flex justify-between items-start">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-6 w-3/4" />
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2 flex-grow">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
      <CardFooter className="p-4 pt-0 mt-auto">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}
