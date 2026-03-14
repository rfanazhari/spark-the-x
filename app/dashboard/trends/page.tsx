import { DashboardHeader } from '@/components/dashboard-header'
import { TrendsContent } from './_components/TrendsContent'

export default function TrendsPage() {
  return (
    <>
      <DashboardHeader title="Trending Topics" />
      <TrendsContent />
    </>
  )
}
