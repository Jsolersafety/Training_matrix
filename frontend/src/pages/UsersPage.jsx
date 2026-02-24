import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { UserPlus, Pencil, Trash2, RotateCcw, Shield, Eye } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Modal, Spinner } from '../components/ui'

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ username: '', password: '', full_name: '', email: '', role: 'viewer' })

  const loadUsers = async () => {
    try {
      const res = await api.get('/auth/users/')
      setUsers(res.data)
    } catch { toast.error('Failed to load users') }
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ username: '', password: '', full_name: '', email: '', role: 'viewer' })
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditing(u)
    setForm({ username: u.username, password: '', full_name: u.full_name || '', email: u.email || '', role: u.role })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const data = { full_name: form.full_name || null, email: form.email || null, role: form.role }
        await api.put(`/auth/users/${editing.id}`, data)
        toast.success('User updated')
      } else {
        await api.post('/auth/users/', {
          username: form.username,
          password: form.password,
          full_name: form.full_name || null,
          email: form.email || null,
          role: form.role,
        })
        toast.success('User created')
      }
      setShowModal(false)
      loadUsers()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed')
    }
  }

  const handleResetPassword = async (u) => {
    if (!confirm(`Reset password for ${u.username} to 'password123'?`)) return
    try {
      await api.put(`/auth/users/${u.id}/reset-password`)
      toast.success(`Password reset for ${u.username}`)
    } catch { toast.error('Reset failed') }
  }

  const handleToggleActive = async (u) => {
    try {
      await api.put(`/auth/users/${u.id}`, { is_active: !u.is_active })
      toast.success(u.is_active ? 'User disabled' : 'User enabled')
      loadUsers()
    } catch { toast.error('Failed') }
  }

  const handleDelete = async (u) => {
    if (!confirm(`Delete user ${u.username}? This cannot be undone.`)) return
    try {
      await api.delete(`/auth/users/${u.id}`)
      toast.success('Deleted')
      loadUsers()
    } catch (err) { toast.error(err.response?.data?.detail || 'Delete failed') }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">User Management</h2>
          <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
            <UserPlus size={16} /> Add User
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-3">Username</th>
              <th className="text-left p-3">Full Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-center p-3">Role</th>
              <th className="text-center p-3">Status</th>
              <th className="text-center p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{u.username}</td>
                <td className="p-3">{u.full_name || '—'}</td>
                <td className="p-3">{u.email || '—'}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role === 'admin' ? <><Shield size={10} className="inline mr-1" />Admin</> : <><Eye size={10} className="inline mr-1" />Viewer</>}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <div className="flex justify-center gap-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleResetPassword(u)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Reset Password">
                      <RotateCcw size={14} />
                    </button>
                    <button onClick={() => handleToggleActive(u)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title={u.is_active ? 'Disable' : 'Enable'}>
                      {u.is_active ? '🔒' : '🔓'}
                    </button>
                    {u.id !== currentUser?.id && (
                      <button onClick={() => handleDelete(u)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit User' : 'Create User'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username *</label>
            <input required disabled={!!editing} className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
          </div>
          {!editing && (
            <div>
              <label className="block text-sm font-medium mb-1">Password *</label>
              <input required type="password" className="w-full px-3 py-2 border rounded-lg" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input className="w-full px-3 py-2 border rounded-lg" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="w-full px-3 py-2 border rounded-lg" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select className="w-full px-3 py-2 border rounded-lg" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="viewer">Viewer (read-only)</option>
              <option value="admin">Admin (full access)</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700">{editing ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-300">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
