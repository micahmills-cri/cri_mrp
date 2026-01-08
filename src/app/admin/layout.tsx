'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Cog6ToothIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  CubeIcon,
  ArrowLeftIcon,
  HomeIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { logger } from '@/lib/logger'

type AdminLayoutProps = {
  children: React.node
}

type User = {
  userId: string
  email: string
  role: 'ADMIN' | 'SUPERVISOR' | 'OPERATOR'
  departmentId?: string | null
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) {
          router.push('/login')
          return
        }
        const data = await res.json()

        // Check if user is admin
        if (data.user.role !== 'ADMIN') {
          router.push('/supervisor')
          return
        }

        setUser(data.user)
      } catch (error) {
        logger.error('Auth check failed:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  async function handleLogout() {
    await fetch('/api/auth/logout')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--background)]">
        <div className="text-[color:var(--muted-strong)]">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const navigation = [
    { name: 'Departments', href: '/admin/departments', icon: BuildingOfficeIcon },
    { name: 'Work Centers', href: '/admin/work-centers', icon: Cog6ToothIcon },
    { name: 'Stations', href: '/admin/stations', icon: WrenchScrewdriverIcon },
    { name: 'Users', href: '/admin/users', icon: UserGroupIcon },
    { name: 'Equipment', href: '/admin/equipment', icon: CubeIcon },
  ]

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Sidebar */}
      <div className="w-64 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)]">
          <h1 className="text-lg font-bold text-[color:var(--foreground)]">Admin Panel</h1>
          <p className="text-sm text-[color:var(--muted-strong)] mt-1">{user.email}</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/supervisor"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[color:var(--muted-strong)] hover:bg-[var(--muted-weak)] hover:text-[color:var(--foreground)] transition-colors"
          >
            <HomeIcon className="h-5 w-5" />
            Supervisor Dashboard
          </Link>

          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold text-[color:var(--muted-strong)] uppercase tracking-wider">
              Configuration
            </p>
          </div>

          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[color:var(--foreground)] hover:bg-[var(--muted-weak)] transition-colors"
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)]">
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-sm text-[color:var(--muted-strong)] hover:text-[color:var(--foreground)] hover:bg-[var(--muted-weak)] rounded-lg transition-colors text-left"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
