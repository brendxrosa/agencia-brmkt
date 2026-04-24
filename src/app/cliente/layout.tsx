import ClienteNav from '@/components/layout/ClienteNav'

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-offwhite">
      <ClienteNav profile={null} />
      <main className="max-w-4xl mx-auto px-4 py-6 animate-fade-in">
        {children}
      </main>
    </div>
  )
}
