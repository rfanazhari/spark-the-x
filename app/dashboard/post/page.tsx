import { DashboardHeader } from '@/components/dashboard-header'
import { PostContent } from './_components/PostContent'

export default function PostPage() {
  return (
    <>
      <DashboardHeader title="Create Post" />
      <PostContent />
    </>
  )
}
