'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import {
  AdjustmentsHorizontalIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  CubeIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function AdminDashboard() {
  const sections = [
    {
      title: 'Departments',
      description: 'Manage organizational departments',
      href: '/admin/departments',
      icon: BuildingOfficeIcon,
      color: 'text-blue-600',
    },
    {
      title: 'Work Centers',
      description: 'Configure work centers and their assignments',
      href: '/admin/work-centers',
      icon: Cog6ToothIcon,
      color: 'text-green-600',
    },
    {
      title: 'Stations',
      description: 'Manage workstations, capacity, pay rates, and equipment',
      href: '/admin/stations',
      icon: WrenchScrewdriverIcon,
      color: 'text-purple-600',
    },
    {
      title: 'Users',
      description: 'Manage users, roles, pay rates, and shifts',
      href: '/admin/users',
      icon: UserGroupIcon,
      color: 'text-orange-600',
    },
    {
      title: 'Equipment',
      description: 'Manage equipment and station assignments',
      href: '/admin/equipment',
      icon: CubeIcon,
      color: 'text-red-600',
    },
    {
      title: 'Product Configurator',
      description: 'Browse and manage product model configurations',
      href: '/admin/product-configurations',
      icon: AdjustmentsHorizontalIcon,
      color: 'text-indigo-600',
    },
  ]

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[color:var(--foreground)]">Admin Dashboard</h1>
          <p className="mt-2 text-[color:var(--muted-strong)]">
            Configure and manage your factory operations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Link key={section.title} href={section.href}>
                <Card interactive className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg bg-[var(--muted-weak)] ${section.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-[color:var(--foreground)] mb-2">
                          {section.title}
                        </h3>
                        <p className="text-sm text-[color:var(--muted-strong)]">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <div className="mt-12">
          <Card>
            <CardHeader divider>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/admin/users?action=create"
                  className="px-4 py-3 bg-[var(--muted-weak)] hover:bg-[var(--muted)] rounded-lg text-center text-sm font-medium text-[color:var(--foreground)] transition-colors"
                >
                  Add New User
                </Link>
                <Link
                  href="/admin/stations?action=create"
                  className="px-4 py-3 bg-[var(--muted-weak)] hover:bg-[var(--muted)] rounded-lg text-center text-sm font-medium text-[color:var(--foreground)] transition-colors"
                >
                  Create Station
                </Link>
                <Link
                  href="/admin/equipment?action=create"
                  className="px-4 py-3 bg-[var(--muted-weak)] hover:bg-[var(--muted)] rounded-lg text-center text-sm font-medium text-[color:var(--foreground)] transition-colors"
                >
                  Add Equipment
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
