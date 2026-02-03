import { Card, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function TicketSkeleton() {
    return (
        <Card className="transition-all">
            <CardHeader className="p-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-5" />
                </div>
                <Skeleton className="h-5 w-3/4 mb-3" />
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-12" />
                    </div>
                    <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
            </CardHeader>
        </Card>
    )
}
