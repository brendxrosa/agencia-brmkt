import TopNav from '@/components/layout/TopNav'
import MainWrap from '@/components/layout/MainWrap'
import ChatFlutuante from '@/components/layout/ChatFlutuante'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F1E6D2] text-[#2B1218]">
      <TopNav />
      <MainWrap>{children}</MainWrap>
      <ChatFlutuante />
    </div>
  )
}
