import { Skeleton } from '@/components/ui/skeleton';

export function EventDetailSkeleton() {
  return (
    <div className="min-h-screen gradient-bg">
      <div className="h-[400px] w-full bg-muted animate-pulse" />
      <div className="max-w-4xl mx-auto -mt-32 relative z-10 p-4">
        <div className="bg-card rounded-xl shadow-xl overflow-hidden p-8 space-y-6">
           <Skeleton className="h-10 w-3/4" />
           <div className="flex gap-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-32" />
           </div>
           <div className="grid md:grid-cols-3 gap-8 mt-8">
              <div className="md:col-span-2 space-y-4">
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-full" />
                 <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="space-y-4">
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}
