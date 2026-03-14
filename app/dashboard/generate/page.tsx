import { Suspense } from 'react'
import { DashboardHeader } from '@/components/dashboard-header'
import { GenerateContent } from './_components/GenerateContent'

function LoadingFallback() {
  return (
    <div className="app-container py-6 md:py-8">
      <div className="max-w-5xl mx-auto space-y-2 mb-8">
        <div className="h-7 w-48 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-72 bg-muted rounded animate-pulse" />
      </div>
    </div>
  )
}

export default function GeneratePage() {
  return (
    <>
      <DashboardHeader title="AI Generator" />
      <Suspense fallback={<LoadingFallback />}>
        <GenerateContent />
      </Suspense>
    </>
  )
}
