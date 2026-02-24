import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Users, BookOpen, LayoutGrid, AlertTriangle, Plus, ChevronDown, ChevronUp, Search, Shield, Award, Clock, XCircle } from 'lucide-react'
import { fetchDashboardStats, fetchExpiringTraining, fetchRoles, fetchDepartments, fetchCompetencies, fetchCategories, createRole, fetchRoleCompetencies, setRoleCompetencies } from '../api/client'
import { Spinner, Modal } from '../components/ui'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [expiring, setExpiring] = useState([])
  const [loading, setLoading] = useState(true)

  // Add Role state
  const [showAddRole, setShowAddRole] = useState(false)
  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])
  const [competencies, setCompetencies] = useState([])
  const [roles, setRoles] = useState([])
  const [roleForm, setRoleForm] = useState({ name: '', department_id: '', role_type: 'primary', description: '' })
  const [saving, setSaving] = useState(false)

  // Competency selection
  const [selectedComps, setSelectedComps] = useState({})
  const [compSearch, setCompSearch] = useState('')
  const [expandedCats, setExpandedCats] = useState({})

  // Edit existing role competencies
  const [editRoleModal, setEditRoleModal] = useState(false)
  const [editRole, setEditRole] = useState(null)
  const [editComps, setEditComps] = useState({})
  const [editSearch, setEditSearch] = useState('')
  const [editExpandedCats, setEditExpandedCats] = useState({})
  const [loadingEdit, setLoadingEdit] = useState(false)

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchExpiringTraining(30), fetchRoles(), fetchDepartments(), fetchCategories(), fetchCompetencies()])
      .then(([s, e, r, d, cat, comp]) => { setStats(s); setExpiring(e); setRoles(r); setDepartments(d); setCategories(cat); setCompetencies(comp) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const loadFormData = async () => {
    try {
      const [d, cat, comp, r] = await Promise.all([fetchDepartments(), fetchCategories(), fetchCompetencies(), fetchRoles()])
      setDepartments(d); setCategories(cat); setCompetencies(comp); setRoles(r)
    } catch { toast.error('Failed to load data') }
  }

  const openAddRole = () => {
    setRoleForm({ name: '', department_id: '', role_type: 'primary', description: '' })
    setSelectedComps({})
    setCompSearch('')
    setShowAddRole(true)
  }

  const openEditRole = async (role) => {
    setEditRole(role)
    setLoadingEdit(true)
    setEditRoleModal(true)
    setEditSearch('')
    try {
      const reqs = await fetchRoleCompetencies(role.id)
      const comps = {}
      reqs.forEach(r => { comps[r.competency_id] = r.requirement_type })
      setEditComps(comps)
    } catch { toast.error('Failed to load role competencies') }
    setLoadingEdit(false)
  }

  const handleCreateRole = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { ...roleForm, department_id: roleForm.department_id ? parseInt(roleForm.department_id) : null }
      const role = await createRole(data)
      const compData = Object.entries(selectedComps).map(([compId, reqType]) => ({
        competency_id: parseInt(compId), requirement_type: reqType
      }))
      if (compData.length > 0) await setRoleCompetencies(role.id, compData)
      toast.success(`Role "${role.name}" created with ${compData.length} competencies`)
      setRoles(prev => [...prev, role])
      setStats(prev => prev ? { ...prev, total_roles: prev.total_roles + 1 } : prev)
      setShowAddRole(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create role')
    }
    setSaving(false)
  }

  const handleSaveEditComps = async () => {
    setSaving(true)
    try {
      const compData = Object.entries(editComps).map(([compId, reqType]) => ({
        competency_id: parseInt(compId), requirement_type: reqType
      }))
      await setRoleCompetencies(editRole.id, compData)
      toast.success(`Updated ${compData.length} competencies for "${editRole.name}"`)
      setEditRoleModal(false)
    } catch { toast.error('Failed to save') }
    setSaving(false)
  }

  const toggleComp = (compId, setStateObj) => {
    setStateObj(prev => {
      const next = { ...prev }
      if (next[compId]) delete next[compId]
      else next[compId] = 'M(A)'
      return next
    })
  }

  const setReqType = (compId, type, setStateObj) => {
    setStateObj(prev => ({ ...prev, [compId]: type }))
  }

  const toggleCat = (catId, setExpandedState) => {
    setExpandedState(prev => ({ ...prev, [catId]: !prev[catId] }))
  }

  const filterComps = (search) => {
    if (!search) return competencies
    return competencies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  }

  const groupByCategory = (comps) => {
    const groups = {}
    comps.forEach(c => {
      const catName = c.category?.name || 'Uncategorized'
      const catId = c.category?.id || 0
      if (!groups[catId]) groups[catId] = { name: catName, id: catId, comps: [] }
      groups[catId].comps.push(c)
    })
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name))
  }

  const reqTypes = ['M(A)', 'M(S)', 'D(A)', 'D(S)', 'LM']

  const CompetencySelector = ({ search, setSearch, selected, setSelected, expanded, setExpanded }) => {
    const filtered = filterComps(search)
    const grouped = groupByCategory(filtered)
    const selectedCount = Object.keys(selected).length

    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm">Competency Requirements ({selectedCount} selected)</h4>
          <div className="flex gap-3">
            <button type="button" onClick={() => { const all = {}; competencies.forEach(c => all[c.id] = 'M(A)'); setSelected(all) }} className="text-xs text-blue-600 hover:underline">Select All</button>
            <button type="button" onClick={() => setSelected({})} className="text-xs text-gray-500 hover:underline">Clear All</button>
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
          <input type="text" placeholder="Search competencies..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="border rounded-lg max-h-72 overflow-y-auto">
          {grouped.map(cat => (
            <div key={cat.id} className="border-b last:border-b-0">
              <button type="button" onClick={() => toggleCat(cat.id, setExpanded)} className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left">
                <span className="font-medium text-sm">{cat.name} <span className="text-gray-400 font-normal">({cat.comps.length})</span></span>
                {expanded[cat.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {expanded[cat.id] && (
                <div className="p-2 space-y-1">
                  {cat.comps.map(comp => {
                    const isSelected = !!selected[comp.id]
                    return (
                      <div key={comp.id} className={`flex items-center justify-between p-2 rounded text-sm ${isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleComp(comp.id, setSelected)} className="rounded flex-shrink-0" />
                          <span className={`truncate ${isSelected ? 'font-medium' : ''}`}>{comp.name}</span>
                        </label>
                        {isSelected && (
                          <select className="ml-2 px-2 py-1 border rounded text-xs bg-white flex-shrink-0" value={selected[comp.id]} onChange={e => setReqType(comp.id, e.target.value, setSelected)}>
                            {reqTypes.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
          {grouped.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">No competencies found</p>}
        </div>
        <div className="mt-2 flex gap-2 flex-wrap text-xs">
          {[['M(A)', 'bg-red-100 text-red-700'], ['M(S)', 'bg-red-50 text-red-600'], ['D(A)', 'bg-blue-100 text-blue-700'], ['D(S)', 'bg-blue-50 text-blue-600'], ['LM', 'bg-orange-100 text-orange-700']].map(([code, cls]) => (
            <span key={code} className={`px-2 py-0.5 rounded ${cls}`}>{code}</span>
          ))}
        </div>
      </div>
    )
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <button onClick={openAddRole} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={18} /> Add New Role
        </button>
      </div>

      {/* Stats — compact inline strip */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-y-3">
          <StatPill icon={<Users size={16} />} label="Staff" value={stats?.total_people || 0} color="blue" />
          <Divider />
          <StatPill icon={<Shield size={16} />} label="Roles" value={stats?.total_roles || 0} color="purple" />
          <Divider />
          <StatPill icon={<Award size={16} />} label="Competencies" value={stats?.total_competencies || 0} color="blue" />
          <Divider />
          <StatPill icon={<BookOpen size={16} />} label="Records" value={stats?.total_records || 0} color="green" />
          <Divider />
          <StatPill icon={<Clock size={16} />} label="Expiring" value={stats?.expiring_count || 0} color="amber" />
          <Divider />
          <StatPill icon={<XCircle size={16} />} label="Expired" value={stats?.expired_count || 0} color="red" />
        </div>
      </div>

      {/* Quick Links — smaller cards */}
      <div className="grid grid-cols-3 gap-3">
        <Link to="/matrix" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg"><LayoutGrid className="text-blue-600" size={20} /></div>
          <div><h3 className="font-bold text-sm">Competency Matrix</h3><p className="text-xs text-gray-500">Roles × competencies</p></div>
        </Link>
        <Link to="/people" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg"><Users className="text-green-600" size={20} /></div>
          <div><h3 className="font-bold text-sm">People & Records</h3><p className="text-xs text-gray-500">Staff training</p></div>
        </Link>
        <Link to="/courses" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="bg-purple-100 p-2 rounded-lg"><BookOpen className="text-purple-600" size={20} /></div>
          <div><h3 className="font-bold text-sm">Training Courses</h3><p className="text-xs text-gray-500">Internal & external</p></div>
        </Link>
      </div>

      {/* Roles Quick Editor */}
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-gray-700">Roles — Click to Edit Competencies</h3>
          <span className="text-xs text-gray-400">{roles.length} roles</span>
        </div>
        {roles.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">Roles will appear here. Click "Add New Role" to get started.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 max-h-64 overflow-y-auto pr-1">
            {roles.map(role => (
              <button key={role.id} onClick={() => openEditRole(role)} className="text-left p-2.5 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group">
                <div className="font-medium text-xs truncate group-hover:text-blue-700">{role.name}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400 truncate">{role.department?.name || '—'}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs leading-none ${role.role_type === 'secondary' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {(role.role_type || 'P')[0].toUpperCase()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expiring Training */}
      {expiring.length > 0 && (
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={18} />
            Expiring Within 30 Days
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 pr-4">Person</th>
                  <th className="pb-2 pr-4">Competency</th>
                  <th className="pb-2 pr-4">Expiry</th>
                  <th className="pb-2">Days</th>
                </tr>
              </thead>
              <tbody>
                {expiring.slice(0, 10).map((item, i) => (
                  <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium">{item.person_name}</td>
                    <td className="py-2 pr-4 text-gray-600">{item.competency_name}</td>
                    <td className="py-2 pr-4 text-gray-500">{new Date(item.expiry_date).toLocaleDateString()}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.days_until_expiry <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.days_until_expiry}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {expiring.length > 10 && <p className="text-xs text-gray-400 mt-2 text-right">+{expiring.length - 10} more — <Link to="/reports" className="text-blue-500 hover:underline">View all</Link></p>}
          </div>
        </div>
      )}

      {/* Add New Role Modal */}
      <Modal isOpen={showAddRole} onClose={() => setShowAddRole(false)} title="Add New Role" size="lg">
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Role Name *</label>
              <input required className="w-full px-3 py-2 border rounded-lg" placeholder="e.g. Site Supervisor" value={roleForm.name} onChange={e => setRoleForm({...roleForm, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select className="w-full px-3 py-2 border rounded-lg" value={roleForm.department_id} onChange={e => setRoleForm({...roleForm, department_id: e.target.value})}>
                <option value="">Select department...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role Type *</label>
              <div className="flex gap-3 mt-1">
                <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 border-2 rounded-lg cursor-pointer transition-colors ${roleForm.role_type === 'primary' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="role_type" value="primary" checked={roleForm.role_type === 'primary'} onChange={e => setRoleForm({...roleForm, role_type: e.target.value})} className="sr-only" />
                  <span className="font-bold text-sm">Primary</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 border-2 rounded-lg cursor-pointer transition-colors ${roleForm.role_type === 'secondary' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="role_type" value="secondary" checked={roleForm.role_type === 'secondary'} onChange={e => setRoleForm({...roleForm, role_type: e.target.value})} className="sr-only" />
                  <span className="font-bold text-sm">Secondary</span>
                </label>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <input className="w-full px-3 py-2 border rounded-lg" placeholder="Optional description..." value={roleForm.description} onChange={e => setRoleForm({...roleForm, description: e.target.value})} />
            </div>
          </div>
          <hr />
          <CompetencySelector search={compSearch} setSearch={setCompSearch} selected={selectedComps} setSelected={setSelectedComps} expanded={expandedCats} setExpanded={setExpandedCats} />
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'Creating...' : `Create Role (${Object.keys(selectedComps).length} competencies)`}
            </button>
            <button type="button" onClick={() => setShowAddRole(false)} className="flex-1 bg-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-300">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Competencies Modal */}
      <Modal isOpen={editRoleModal} onClose={() => setEditRoleModal(false)} title={editRole ? `Edit — ${editRole.name}` : 'Edit'} size="lg">
        {loadingEdit ? <Spinner /> : (
          <div className="space-y-4">
            <CompetencySelector search={editSearch} setSearch={setEditSearch} selected={editComps} setSelected={setEditComps} expanded={editExpandedCats} setExpanded={setEditExpandedCats} />
            <div className="flex gap-3 pt-2">
              <button onClick={handleSaveEditComps} disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                {saving ? 'Saving...' : `Save (${Object.keys(editComps).length} competencies)`}
              </button>
              <button onClick={() => setEditRoleModal(false)} className="flex-1 bg-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-300">Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// Compact stat pill for the inline strip
function StatPill({ icon, label, value, color }) {
  const colors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
  }
  return (
    <div className="flex items-center gap-2 px-2">
      <span className={`${colors[color]} opacity-70`}>{icon}</span>
      <div className="leading-tight">
        <div className={`text-lg font-bold ${colors[color]}`}>{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="hidden sm:block w-px h-10 bg-gray-200" />
}
