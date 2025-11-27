'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Building2, 
  Settings, 
  Home,
  Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationDropdown } from './NotificationDropdown'

interface SidebarItem {
  title: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  badge?: string
}

const adminItems: SidebarItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { title: 'Reports', icon: FileText, href: '/admin/reports' },
  { title: 'Officers', icon: Users, href: '/admin/officers' },
  { title: 'Organizations', icon: Building2, href: '/admin/organizations' },
  { title: 'Notifications', icon: Bell, href: '/notifications' },
  { title: 'Settings', icon: Settings, href: '/admin/settings' },
]

const officerItems: SidebarItem[] = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '/officer' },
  { title: 'My Reports', icon: FileText, href: '/officer/reports' },
  { title: 'Notifications', icon: Bell, href: '/notifications' },
  { title: 'Settings', icon: Settings, href: '/officer/settings' },
]

interface AdminSidebarProps {
  variant?: 'admin' | 'officer'
  userName?: string
  userRole?: string
}

export function AdminSidebar({ variant = 'admin', userName, userRole }: AdminSidebarProps) {
  const pathname = usePathname()
  const items = variant === 'admin' ? adminItems : officerItems

  return (
    <div className="flex h-screen w-64 flex-col bg-slate-900 border-r border-slate-800">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-6">
        <div className="flex items-center gap-2">
          <img
            src="/Coat_of_Arms_Rwanda-01.png"
            alt="Rwanda Coat of Arms"
            className="h-8 w-8 object-contain"
          />
          <span className="text-lg font-bold text-white">CIRA</span>
          <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs font-semibold text-blue-400">
            {variant === 'admin' ? 'ADMIN' : 'OFFICER'}
          </span>
        </div>
        <NotificationDropdown />
      </div>

      {/* User Profile */}
      {userName && (
        <div className="border-b border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white">
              {userName[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-slate-400 capitalize">{userRole || variant}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
              {item.badge && (
                <span className="ml-auto rounded-full bg-slate-700 px-2 py-0.5 text-xs">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <Home className="h-5 w-5" />
          <span>Back to Home</span>
        </Link>
        <div className="mt-4 text-xs text-slate-500">
          <p>CIRA © {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  )
}

