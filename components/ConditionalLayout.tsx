'use client'
import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Footer from './Footer'

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHidden = pathname.startsWith('/tracking') || pathname.startsWith('/schedule') || pathname.startsWith('/review') || pathname.startsWith('/admin')
  return (
    <>
      {!isHidden && <Navbar />}
      {children}
      {!isHidden && <Footer />}
    </>
  )
}
