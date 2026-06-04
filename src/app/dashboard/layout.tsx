import Sidebar from '@/components/layout/Sidebar'
import ChatFlutuante from '@/components/layout/ChatFlutuante'
import NotificacoesSino from '@/components/layout/NotificacoesSino'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-offwhite">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen lg:ml-56">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center justify-between lg:justify-end gap-3">
          <div className="w-10 lg:hidden" />
          <NotificacoesSino />
        </header>
        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
      <ChatFlutuante />
    </div>
  )
}
