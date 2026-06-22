'use client'
import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import Footer from './Footer'

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isTracking = pathname.startsWith('/tracking')
  return (
    <>
      {!isTracking && <Navbar />}
      {children}
      {!isTracking && <Footer />}
    </>
  )
}
