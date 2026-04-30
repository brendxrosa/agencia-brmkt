import Sidebar from '@/components/layout/Sidebar'
import ChatFlutuante from '@/components/layout/ChatFlutuante'
import NotificacoesSino from '@/components/layout/NotificacoesSino'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-offwhite">
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-3 flex items-center justify-end gap-3">
          <NotificacoesSino />
        </header>
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
      <ChatFlutuante />
    </div>
  )
}
