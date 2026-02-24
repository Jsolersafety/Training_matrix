import React from 'react'
import { X } from 'lucide-react'

// ── Modal ───────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className={`bg-white rounded-lg shadow-xl p-6 ${sizes[size]} w-full max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Status Badge ────────────────────────────────────────────
export function StatusBadge({ status }) {
  const styles = {
    complete: 'status-complete',
    expiring: 'status-expiring',
    expired: 'status-expired',
    pending: 'status-pending',
  }
  const labels = {
    complete: 'Current',
    expiring: 'Expiring Soon',
    expired: 'Expired',
    pending: 'Not Completed',
  }
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[status] || 'bg-gray-300'}`}>{labels[status] || status}</span>
}

// ── Requirement Badge ───────────────────────────────────────
export function RequirementBadge({ type }) {
  if (!type) return <span className="text-gray-300">•</span>
  const color = type.startsWith('M') ? 'bg-red-500 text-white' : type === 'LM' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white'
  return <span className={`px-2 py-1 rounded font-semibold text-xs ${color}`}>{type}</span>
}

// ── Loading Spinner ─────────────────────────────────────────
export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )
}

// ── Empty State ─────────────────────────────────────────────
export function EmptyState({ message = 'No data found', icon }) {
  return (
    <div className="text-center py-12 text-gray-500">
      {icon && <div className="text-4xl mb-2">{icon}</div>}
      <p>{message}</p>
    </div>
  )
}

// ── Stat Card ───────────────────────────────────────────────
export function StatCard({ label, value, color = 'blue', icon }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }
  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-sm">{label}</div>
        </div>
        {icon && <div className="text-3xl opacity-50">{icon}</div>}
      </div>
    </div>
  )
}
