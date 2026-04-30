import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import ChatFlutuante from '@/components/layout/ChatFlutuante'
import NotificacoesSino from '@/components/layout/NotificacoesSino'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('nome, role, avatar_url').eq('id', user.id).single()

  if (!profile || !['admin', 'equipe'].includes(profile.role)) redirect('/auth/login')

  return (
    <div className="flex min-h-screen bg-offwhite">
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-6 py-3 flex items-center justify-end gap-3">
          <NotificacoesSino />
          <div className="flex items-center gap-2">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.nome} className="w-8 h-8 rounded-xl object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-vinho flex items-center justify-center text-white text-xs font-bold">
                {profile.nome?.charAt(0)}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{profile.nome?.split(' ')[0]}</span>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto animate-fade-in">
          {children}
        </main>
      </div>
      <ChatFlutuante />
    </div>
  )
}
