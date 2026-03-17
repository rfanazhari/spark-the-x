import { DashboardHeader } from '@/components/dashboard-header'
import { ReplyHunterContent } from './_components/ReplyHunterContent'

export default function ReplyHunterPage() {
  return (
    <div>
      <DashboardHeader
        title="Reply Hunter"
        subtitle="Temukan thread ramai & reply dengan AI"
      />
      <ReplyHunterContent />
    </div>
  )
}
