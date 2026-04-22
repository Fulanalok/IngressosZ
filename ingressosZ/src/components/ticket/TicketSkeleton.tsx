import { Skeleton } from '@/components/ui/skeleton';

export function TicketSkeleton() {
  return (
    <div className="bg-card rounded-lg border shadow-md p-6 max-w-sm mx-auto space-y-6">
       <div className="flex justify-center">
         <Skeleton className="h-8 w-3/4" />
       </div>
       <div className="space-y-4">
         <Skeleton className="h-12 w-full" />
         <Skeleton className="h-12 w-full" />
         <Skeleton className="h-12 w-full" />
       </div>
       <div className="pt-6 border-t border-dashed">
         <Skeleton className="h-12 w-full" />
       </div>
    </div>
  )
}
