import { DashboardHeader } from '@/components/dashboard-header'
import { PostsContent } from './_components/PostsContent'

export default function PostsPage() {
  return (
    <>
      <DashboardHeader title="Post History" subtitle="Semua postingan @{username}" />
      <PostsContent />
    </>
  )
}
