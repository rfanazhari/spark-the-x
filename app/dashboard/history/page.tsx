import { DashboardHeader } from '@/components/dashboard-header'
import { PostsContent } from '../posts/_components/PostsContent'

export default function HistoryPage() {
  return (
    <>
      <DashboardHeader title="Post History" subtitle="Semua postingan @{username}" />
      <PostsContent />
    </>
  )
}
