import Sidebar from '@/components/layout/Sidebar'
import ChatFlutuante from '@/components/layout/ChatFlutuante'
import NotificacoesSino from '@/components/layout/NotificacoesSino'
import PushNotificacoes from '@/components/layout/PushNotificacoes'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-offwhite">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen lg:ml-56">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 lg:px-6 py-3 flex items-center justify-between lg:justify-end gap-3">
          {/* Espaço pro botão hamburguer no mobile */}
          <div className="w-10 lg:hidden" />
          <div className="flex items-center gap-3">
            <NotificacoesSino />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
      <ChatFlutuante />
    </div>
  )
}
