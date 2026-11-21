import TopNav from '@/components/layout/TopNav'
import ChatFlutuante from '@/components/layout/ChatFlutuante'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-offwhite">
      <TopNav />
      <main className="max-w-[1400px] w-full mx-auto p-4 lg:p-8 pb-24 animate-fade-in">
        {children}
      </main>
      <ChatFlutuante />
    </div>
  )
}
