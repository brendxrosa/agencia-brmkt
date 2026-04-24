import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClienteNav from '@/components/layout/ClienteNav'

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/cliente-login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, clientes(nome, cor)')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'cliente') redirect('/auth/login')

  return (
    <div className="min-h-screen bg-offwhite">
      <ClienteNav profile={profile} />
      <main className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
        {children}
      </main>
    </div>
  )
}
