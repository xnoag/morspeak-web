'use client'
import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Footer from './Footer'

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isScreeningPreview = pathname === '/apply/renewal'
  const isHidden = pathname === '/' || pathname === '/home/renewal' || pathname.startsWith('/tracking') || pathname.startsWith('/schedule') || pathname.startsWith('/review') || pathname.startsWith('/admin') || pathname.startsWith('/survey') || pathname.startsWith('/receipts') || pathname.startsWith('/waitlist') || pathname.startsWith('/patient-report')
  return (
    <>
      {!isHidden && !isScreeningPreview && <Navbar />}
      {children}
      {!isHidden && !isScreeningPreview && <Footer />}
    </>
  )
}
