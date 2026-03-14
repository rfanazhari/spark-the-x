export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="h-5 w-28 bg-muted rounded-full" />
        <div className="h-5 w-10 bg-muted rounded-full" />
      </div>
      <div className="space-y-2 pt-1">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-[85%]" />
        <div className="h-4 bg-muted rounded w-[70%]" />
      </div>
      <div className="space-y-1.5 pt-1">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-[60%]" />
      </div>
      <div className="flex gap-2 pt-1">
        <div className="h-5 w-16 bg-muted rounded-full" />
        <div className="h-5 w-14 bg-muted rounded-full" />
      </div>
      <div className="h-8 bg-muted rounded-lg mt-2" />
    </div>
  )
}
