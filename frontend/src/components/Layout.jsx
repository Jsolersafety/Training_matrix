import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutGrid, BookOpen, Users, BarChart3, GraduationCap, LogOut, Shield, UserCog, Settings } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export default function Layout() {
  const { user, logout, isAdmin } = useAuth()

  const navItems = [
    { to: '/', icon: BarChart3, label: 'Dashboard' },
    { to: '/matrix', icon: LayoutGrid, label: 'Competency Matrix' },
    { to: '/courses', icon: BookOpen, label: 'Training Courses' },
    { to: '/people', icon: Users, label: 'People & Records' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
  ]

  if (isAdmin) {
    navItems.push({ to: '/users', icon: UserCog, label: 'Users' })
    navItems.push({ to: '/admin', icon: Settings, label: 'Admin' })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap size={32} />
            <div>
              <h1 className="text-2xl font-bold">Training Management System</h1>
              <p className="text-blue-100 text-sm">Cook Shire Council</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="font-medium">{user?.full_name || user?.username}</p>
              <p className="text-blue-200 text-xs flex items-center gap-1 justify-end">
                {isAdmin ? <><Shield size={10} /> Admin</> : 'Viewer'}
              </p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 px-3 py-2 rounded-lg text-sm transition"
              title="Sign out"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800 hover:border-gray-300'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Read-only banner for viewers */}
      {!isAdmin && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-700 text-xs text-center py-1.5">
          Read-only mode — contact an admin for edit access
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
