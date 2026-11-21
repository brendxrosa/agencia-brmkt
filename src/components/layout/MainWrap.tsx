'use client'

import { usePathname } from 'next/navigation'

// A home usa o layout "de ponta a ponta" do design; as outras páginas mantêm o respiro de sempre.
export default function MainWrap({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const home = pathname === '/dashboard'
  return (
    <main className={home ? 'w-full animate-fade-in pb-24' : 'max-w-[1400px] w-full mx-auto p-4 lg:p-8 pb-24 animate-fade-in'}>
      {children}
    </main>
  )
}
