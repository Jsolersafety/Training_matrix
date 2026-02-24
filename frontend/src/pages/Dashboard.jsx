import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Users, BookOpen, LayoutGrid, AlertTriangle, Plus, ChevronDown, ChevronUp, Search, Shield, Award, Clock, XCircle, X, Pencil, Trash2 } from 'lucide-react'
import { fetchDashboardStats, fetchExpiringTraining, fetchRoles, fetchDepartments, fetchCompetencies, fetchCategories, fetchPeople, fetchCourses, createRole, updateRole, deleteRole, createCompetency, updateCompetency, deleteCompetency, createPerson, updatePerson, deletePerson, createDepartment, fetchRoleCompetencies, setRoleCompetencies } from '../api/client'
import { Spinner, Modal } from '../components/ui'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [expiring, setExpiring] = useState([])
  const [loading, setLoading] = useState(true)

  // Data
  const [departments, setDepartments] = useState([])
  const [categories, setCategories] = useState([])
  const [competencies, setCompetencies] = useState([])
  const [roles, setRoles] = useState([])
  const [people, setPeople] = useState([])
  const [courses, setCourses] = useState([])

  // Expanded panel
  const [expandedStat, setExpandedStat] = useState(null)
  const [panelSearch, setPanelSearch] = useState('')

  // Add/Edit Role
  const [showAddRole, setShowAddRole] = useState(false)
  const [roleForm, setRoleForm] = useState({ name: '', department_id: '', role_type: 'primary', description: '' })
  const [editingRole, setEditingRole] = useState(null)
  const [saving, setSaving] = useState(false)

  // Competency selection for roles
  const [selectedComps, setSelectedComps] = useState({})
  const [compSearch, setCompSearch] = useState('')
  const [expandedCats, setExpandedCats] = useState({})

  // Edit role competencies
  const [editRoleModal, setEditRoleModal] = useState(false)
  const [editRole, setEditRole] = useState(null)
  const [editComps, setEditComps] = useState({})
  const [editSearch, setEditSearch] = useState('')
  const [editExpandedCats, setEditExpandedCats] = useState({})
  const [loadingEdit, setLoadingEdit] = useState(false)

  // Edit person inline
  const [editPersonModal, setEditPersonModal] = useState(false)
  const [editingPerson, setEditingPerson] = useState(null)
  const [personForm, setPersonForm] = useState({ first_name: '', last_name: '', email: '', phone: '', role_id: '', department_id: '', employee_number: '' })

  // Edit competency inline
  const [editCompModal, setEditCompModal] = useState(false)
  const [editingComp, setEditingComp] = useState(null)
  const [compForm, setCompForm] = useState({ name: '', category_id: '', description: '' })

  useEffect(() => {
    Promise.all([
      fetchDashboardStats(), fetchExpiringTraining(30),
      fetchRoles(), fetchDepartments(), fetchCategories(),
      fetchCompetencies(), fetchPeople({}), fetchCourses()
    ])
      .then(([s, e, r, d, cat, comp, p, co]) => {
        setStats(s); setExpiring(e); setRoles(r); setDepartments(d)
        setCategories(cat); setCompetencies(comp); setPeople(p); setCourses(co)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // ── Stat panel toggle ─────────────────────────────
  const toggleStat = (key) => {
    setExpandedStat(prev => prev === key ? null : key)
    setPanelSearch('')
  }

  // ── Role CRUD ─────────────────────────────────────
  const openAddRole = () => {
    setEditingRole(null)
    setRoleForm({ name: '', department_id: '', role_type: 'primary', description: '' })
    setSelectedComps({})
    setCompSearch('')
    setShowAddRole(true)
  }

  const openEditRoleForm = (role) => {
    setEditingRole(role)
    setRoleForm({ name: role.name, department_id: role.department_id || '', role_type: role.role_type || 'primary', description: role.description || '' })
    setSelectedComps({})
    setCompSearch('')
    setShowAddRole(true)
    // Load existing competencies
    fetchRoleCompetencies(role.id).then(reqs => {
      const comps = {}
      reqs.forEach(r => { comps[r.competency_id] = r.requirement_type })
      setSelectedComps(comps)
    }).catch(() => {})
  }

  const openEditRoleComps = async (role) => {
    setEditRole(role)
    setLoadingEdit(true)
    setEditRoleModal(true)
    setEditSearch('')
    try {
      const reqs = await fetchRoleCompetencies(role.id)
      const comps = {}
      reqs.forEach(r => { comps[r.competency_id] = r.requirement_type })
      setEditComps(comps)
    } catch { toast.error('Failed to load') }
    setLoadingEdit(false)
  }

  const handleSaveRole = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { ...roleForm, department_id: roleForm.department_id ? parseInt(roleForm.department_id) : null }
      let role
      if (editingRole) {
        role = await updateRole(editingRole.id, data)
        setRoles(prev => prev.map(r => r.id === role.id ? role : r))
      } else {
        role = await createRole(data)
        setRoles(prev => [...prev, role])
        setStats(prev => prev ? { ...prev, total_roles: prev.total_roles + 1 } : prev)
      }
      const compData = Object.entries(selectedComps).map(([compId, reqType]) => ({
        competency_id: parseInt(compId), requirement_type: reqType
      }))
      if (compData.length > 0) await setRoleCompetencies(role.id, compData)
      toast.success(editingRole ? 'Role updated' : `Role created with ${compData.length} competencies`)
      setShowAddRole(false)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save') }
    setSaving(false)
  }

  const handleDeleteRole = async (id) => {
    if (!confirm('Delete this role?')) return
    try {
      await deleteRole(id)
      setRoles(prev => prev.filter(r => r.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed — role may have people assigned') }
  }

  const handleSaveEditComps = async () => {
    setSaving(true)
    try {
      const compData = Object.entries(editComps).map(([compId, reqType]) => ({
        competency_id: parseInt(compId), requirement_type: reqType
      }))
      await setRoleCompetencies(editRole.id, compData)
      toast.success(`Updated ${compData.length} competencies`)
      setEditRoleModal(false)
    } catch { toast.error('Failed') }
    setSaving(false)
  }

  // ── Person CRUD ───────────────────────────────────
  const openEditPerson = (person) => {
    setEditingPerson(person)
    setPersonForm({
      first_name: person.first_name, last_name: person.last_name,
      email: person.email || '', phone: person.phone || '',
      role_id: person.role_id || '', department_id: person.department_id || '',
      employee_number: person.employee_number || ''
    })
    setEditPersonModal(true)
  }

  const handleSavePerson = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { ...personForm, role_id: personForm.role_id ? parseInt(personForm.role_id) : null, department_id: personForm.department_id ? parseInt(personForm.department_id) : null }
      if (editingPerson) {
        const updated = await updatePerson(editingPerson.id, data)
        setPeople(prev => prev.map(p => p.id === editingPerson.id ? updated : p))
        toast.success('Updated')
      } else {
        const created = await createPerson(data)
        setPeople(prev => [...prev, created])
        toast.success('Created')
      }
      setEditPersonModal(false)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    setSaving(false)
  }

  const handleDeletePerson = async (id) => {
    if (!confirm('Delete?')) return
    try { await deletePerson(id); setPeople(prev => prev.filter(p => p.id !== id)); toast.success('Deleted') } catch { toast.error('Failed') }
  }

  // ── Competency CRUD ───────────────────────────────
  const openEditComp = (comp) => {
    setEditingComp(comp)
    setCompForm({ name: comp.name, category_id: comp.category_id || '', description: comp.description || '' })
    setEditCompModal(true)
  }

  const handleSaveComp = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { ...compForm, category_id: compForm.category_id ? parseInt(compForm.category_id) : null }
      if (editingComp) {
        const updated = await updateCompetency(editingComp.id, data)
        setCompetencies(prev => prev.map(c => c.id === editingComp.id ? updated : c))
        toast.success('Updated')
      } else {
        const created = await createCompetency(data)
        setCompetencies(prev => [...prev, created])
        toast.success('Created')
      }
      setEditCompModal(false)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    setSaving(false)
  }

  const handleDeleteComp = async (id) => {
    if (!confirm('Delete?')) return
    try { await deleteCompetency(id); setCompetencies(prev => prev.filter(c => c.id !== id)); toast.success('Deleted') } catch { toast.error('Failed') }
  }

  // ── Competency selector helpers ───────────────────
  const toggleComp = (compId, setStateObj) => {
    setStateObj(prev => { const next = { ...prev }; if (next[compId]) delete next[compId]; else next[compId] = 'M(A)'; return next })
  }
  const setReqType = (compId, type, setStateObj) => { setStateObj(prev => ({ ...prev, [compId]: type })) }
  const toggleCat = (catId, setExpandedState) => { setExpandedState(prev => ({ ...prev, [catId]: !prev[catId] })) }
  const filterComps = (search) => !search ? competencies : competencies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
  const groupByCategory = (comps) => {
    const groups = {}
    comps.forEach(c => { const cn = c.category?.name || 'Uncategorized'; const ci = c.category?.id || 0; if (!groups[ci]) groups[ci] = { name: cn, id: ci, comps: [] }; groups[ci].comps.push(c) })
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name))
  }
  const reqTypes = ['M(A)', 'M(S)', 'D(A)', 'D(S)', 'LM']

  const CompetencySelector = ({ search, setSearch, selected, setSelected, expanded, setExpanded }) => {
    const grouped = groupByCategory(filterComps(search))
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm">Competency Requirements ({Object.keys(selected).length} selected)</h4>
          <div className="flex gap-3">
            <button type="button" onClick={() => { const all = {}; competencies.forEach(c => all[c.id] = 'M(A)'); setSelected(all) }} className="text-xs text-blue-600 hover:underline">All</button>
            <button type="button" onClick={() => setSelected({})} className="text-xs text-gray-500 hover:underline">Clear</button>
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
          <input type="text" placeholder="Search..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="border rounded-lg max-h-72 overflow-y-auto">
          {grouped.map(cat => (
            <div key={cat.id} className="border-b last:border-b-0">
              <button type="button" onClick={() => toggleCat(cat.id, setExpanded)} className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left">
                <span className="font-medium text-sm">{cat.name} ({cat.comps.length})</span>
                {expanded[cat.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {expanded[cat.id] && <div className="p-2 space-y-1">{cat.comps.map(comp => {
                const sel = !!selected[comp.id]
                return (<div key={comp.id} className={`flex items-center justify-between p-2 rounded text-sm ${sel ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'}`}>
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"><input type="checkbox" checked={sel} onChange={() => toggleComp(comp.id, setSelected)} className="rounded flex-shrink-0" /><span className={`truncate ${sel ? 'font-medium' : ''}`}>{comp.name}</span></label>
                  {sel && <select className="ml-2 px-2 py-1 border rounded text-xs bg-white flex-shrink-0" value={selected[comp.id]} onChange={e => setReqType(comp.id, e.target.value, setSelected)}>{reqTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>}
                </div>)
              })}</div>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Panel data & filtering ────────────────────────
  const getPanelData = () => {
    const s = panelSearch.toLowerCase()
    switch (expandedStat) {
      case 'staff': return people.filter(p => !s || `${p.first_name} ${p.last_name}`.toLowerCase().includes(s))
      case 'roles': return roles.filter(r => !s || r.name.toLowerCase().includes(s))
      case 'competencies': return competencies.filter(c => !s || c.name.toLowerCase().includes(s))
      case 'records': return []
      case 'expiring': return expiring
      case 'expired': return []
      default: return []
    }
  }

  if (loading) return <Spinner />

  const panelData = getPanelData()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <button onClick={openAddRole} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm">
          <Plus size={18} /> Add New Role
        </button>
      </div>

      {/* Stats Strip — each clickable */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex flex-wrap items-stretch">
          {[
            { key: 'staff', icon: <Users size={16} />, label: 'Staff', value: stats?.total_people || 0, color: 'blue' },
            { key: 'roles', icon: <Shield size={16} />, label: 'Roles', value: stats?.total_roles || 0, color: 'purple' },
            { key: 'competencies', icon: <Award size={16} />, label: 'Competencies', value: stats?.total_competencies || 0, color: 'blue' },
            { key: 'records', icon: <BookOpen size={16} />, label: 'Records', value: stats?.total_records || 0, color: 'green' },
            { key: 'expiring', icon: <Clock size={16} />, label: 'Expiring', value: stats?.expiring_count || 0, color: 'amber' },
            { key: 'expired', icon: <XCircle size={16} />, label: 'Expired', value: stats?.expired_count || 0, color: 'red' },
          ].map(({ key, icon, label, value, color }) => {
            const colors = { blue: 'text-blue-600', green: 'text-green-600', red: 'text-red-600', amber: 'text-amber-600', purple: 'text-purple-600' }
            const active = expandedStat === key
            return (
              <button key={key} onClick={() => toggleStat(key)}
                className={`flex-1 flex items-center gap-2 px-4 py-3 border-b-2 transition-colors hover:bg-gray-50 min-w-0 ${active ? 'border-blue-500 bg-blue-50' : 'border-transparent'}`}>
                <span className={`${colors[color]} opacity-70 flex-shrink-0`}>{icon}</span>
                <div className="leading-tight text-left min-w-0">
                  <div className={`text-lg font-bold ${colors[color]}`}>{value}</div>
                  <div className="text-xs text-gray-500 truncate">{label}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Expandable Panel */}
        {expandedStat && (
          <div className="border-t p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-gray-700 capitalize">{expandedStat === 'staff' ? 'Staff Members' : expandedStat}</h3>
                {['staff', 'roles', 'competencies'].includes(expandedStat) && (
                  <button onClick={() => {
                    if (expandedStat === 'staff') { setEditingPerson(null); setPersonForm({ first_name: '', last_name: '', email: '', phone: '', role_id: '', department_id: '', employee_number: '' }); setEditPersonModal(true) }
                    if (expandedStat === 'roles') openAddRole()
                    if (expandedStat === 'competencies') { setEditingComp(null); setCompForm({ name: '', category_id: '', description: '' }); setEditCompModal(true) }
                  }} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                    <Plus size={12} className="inline -mt-0.5" /> Add
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {['staff', 'roles', 'competencies'].includes(expandedStat) && (
                  <input type="text" placeholder="Search..." className="px-3 py-1.5 border rounded text-sm w-48" value={panelSearch} onChange={e => setPanelSearch(e.target.value)} />
                )}
                <button onClick={() => setExpandedStat(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {/* Staff Panel */}
              {expandedStat === 'staff' && (
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-xs text-gray-500 uppercase">
                    <th className="pb-2 pr-3">Name</th><th className="pb-2 pr-3">Role</th><th className="pb-2 pr-3">Department</th><th className="pb-2 pr-3">Email</th><th className="pb-2 w-20">Actions</th>
                  </tr></thead>
                  <tbody>{panelData.map(p => (
                    <tr key={p.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="py-2 pr-3 font-medium">{p.first_name} {p.last_name}</td>
                      <td className="py-2 pr-3 text-gray-600">{p.role?.name || '—'}</td>
                      <td className="py-2 pr-3 text-gray-500">{p.department?.name || '—'}</td>
                      <td className="py-2 pr-3 text-gray-500">{p.email || '—'}</td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <button onClick={() => openEditPerson(p)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                          <button onClick={() => handleDeletePerson(p.id)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}

              {/* Roles Panel */}
              {expandedStat === 'roles' && (
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-xs text-gray-500 uppercase">
                    <th className="pb-2 pr-3">Role</th><th className="pb-2 pr-3">Department</th><th className="pb-2 pr-3">Type</th><th className="pb-2 w-32">Actions</th>
                  </tr></thead>
                  <tbody>{panelData.map(r => (
                    <tr key={r.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="py-2 pr-3 font-medium">{r.name}</td>
                      <td className="py-2 pr-3 text-gray-600">{r.department?.name || '—'}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-0.5 rounded text-xs ${r.role_type === 'secondary' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                          {r.role_type || 'primary'}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <button onClick={() => openEditRoleForm(r)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Edit role"><Pencil size={14} /></button>
                          <button onClick={() => openEditRoleComps(r)} className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded" title="Edit competencies">Comps</button>
                          <button onClick={() => handleDeleteRole(r.id)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}

              {/* Competencies Panel */}
              {expandedStat === 'competencies' && (
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-xs text-gray-500 uppercase">
                    <th className="pb-2 pr-3">Competency</th><th className="pb-2 pr-3">Category</th><th className="pb-2 w-20">Actions</th>
                  </tr></thead>
                  <tbody>{panelData.map(c => (
                    <tr key={c.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="py-2 pr-3 font-medium">{c.name}</td>
                      <td className="py-2 pr-3 text-gray-600">{c.category?.name || '—'}</td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <button onClick={() => openEditComp(c)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteComp(c.id)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}

              {/* Expiring Panel */}
              {expandedStat === 'expiring' && (
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-xs text-gray-500 uppercase">
                    <th className="pb-2 pr-3">Person</th><th className="pb-2 pr-3">Competency</th><th className="pb-2 pr-3">Expiry</th><th className="pb-2">Days</th>
                  </tr></thead>
                  <tbody>{expiring.map((item, i) => (
                    <tr key={i} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="py-2 pr-3 font-medium">{item.person_name}</td>
                      <td className="py-2 pr-3 text-gray-600">{item.competency_name}</td>
                      <td className="py-2 pr-3 text-gray-500">{new Date(item.expiry_date).toLocaleDateString()}</td>
                      <td className="py-2"><span className={`px-2 py-0.5 rounded text-xs font-bold ${item.days_until_expiry <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{item.days_until_expiry}d</span></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}

              {/* Records & Expired — link to pages */}
              {(expandedStat === 'records' || expandedStat === 'expired') && (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-3">View detailed {expandedStat} data on the dedicated pages:</p>
                  <div className="flex gap-3 justify-center">
                    <Link to="/people" className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium">People & Records</Link>
                    <Link to="/reports" className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium">Reports</Link>
                  </div>
                </div>
              )}

              {panelData.length === 0 && ['staff', 'roles', 'competencies'].includes(expandedStat) && (
                <p className="text-center text-gray-400 py-6 text-sm">No results found</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Links */}
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

      {/* ═══ MODALS ═══ */}

      {/* Add/Edit Role Modal */}
      <Modal isOpen={showAddRole} onClose={() => setShowAddRole(false)} title={editingRole ? `Edit Role — ${editingRole.name}` : 'Add New Role'} size="lg">
        <form onSubmit={handleSaveRole} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Role Name *</label>
              <input required className="w-full px-3 py-2 border rounded-lg" value={roleForm.name} onChange={e => setRoleForm({...roleForm, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select className="w-full px-3 py-2 border rounded-lg" value={roleForm.department_id} onChange={e => setRoleForm({...roleForm, department_id: e.target.value})}>
                <option value="">Select...</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role Type</label>
              <div className="flex gap-3 mt-1">
                {['primary', 'secondary'].map(t => (
                  <label key={t} className={`flex-1 text-center p-2.5 border-2 rounded-lg cursor-pointer transition-colors ${roleForm.role_type === t ? (t === 'primary' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-purple-500 bg-purple-50 text-purple-700') : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="role_type" value={t} checked={roleForm.role_type === t} onChange={e => setRoleForm({...roleForm, role_type: e.target.value})} className="sr-only" />
                    <span className="font-bold text-sm capitalize">{t}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <hr />
          <CompetencySelector search={compSearch} setSearch={setCompSearch} selected={selectedComps} setSelected={setSelectedComps} expanded={expandedCats} setExpanded={setExpandedCats} />
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'Saving...' : editingRole ? 'Update Role' : `Create Role (${Object.keys(selectedComps).length} comps)`}
            </button>
            <button type="button" onClick={() => setShowAddRole(false)} className="flex-1 bg-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-300">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Competencies Modal */}
      <Modal isOpen={editRoleModal} onClose={() => setEditRoleModal(false)} title={editRole ? `Competencies — ${editRole.name}` : 'Edit'} size="lg">
        {loadingEdit ? <Spinner /> : (
          <div className="space-y-4">
            <CompetencySelector search={editSearch} setSearch={setEditSearch} selected={editComps} setSelected={setEditComps} expanded={editExpandedCats} setExpanded={setEditExpandedCats} />
            <div className="flex gap-3">
              <button onClick={handleSaveEditComps} disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                {saving ? 'Saving...' : `Save (${Object.keys(editComps).length} competencies)`}
              </button>
              <button onClick={() => setEditRoleModal(false)} className="flex-1 bg-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-300">Cancel</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Person Modal */}
      <Modal isOpen={editPersonModal} onClose={() => setEditPersonModal(false)} title={editingPerson ? `Edit — ${editingPerson.first_name} ${editingPerson.last_name}` : 'Add Person'} size="md">
        <form onSubmit={handleSavePerson} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">First Name *</label><input required className="w-full px-3 py-2 border rounded-lg" value={personForm.first_name} onChange={e => setPersonForm({...personForm, first_name: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1">Last Name *</label><input required className="w-full px-3 py-2 border rounded-lg" value={personForm.last_name} onChange={e => setPersonForm({...personForm, last_name: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" className="w-full px-3 py-2 border rounded-lg" value={personForm.email} onChange={e => setPersonForm({...personForm, email: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1">Phone</label><input className="w-full px-3 py-2 border rounded-lg" value={personForm.phone} onChange={e => setPersonForm({...personForm, phone: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1">Role</label><select className="w-full px-3 py-2 border rounded-lg" value={personForm.role_id} onChange={e => setPersonForm({...personForm, role_id: e.target.value})}><option value="">Select...</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Department</label><select className="w-full px-3 py-2 border rounded-lg" value={personForm.department_id} onChange={e => setPersonForm({...personForm, department_id: e.target.value})}><option value="">Select...</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Employee #</label><input className="w-full px-3 py-2 border rounded-lg" value={personForm.employee_number} onChange={e => setPersonForm({...personForm, employee_number: e.target.value})} /></div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : editingPerson ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => setEditPersonModal(false)} className="flex-1 bg-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-300">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Edit Competency Modal */}
      <Modal isOpen={editCompModal} onClose={() => setEditCompModal(false)} title={editingComp ? `Edit — ${editingComp.name}` : 'Add Competency'} size="md">
        <form onSubmit={handleSaveComp} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Competency Name *</label><input required className="w-full px-3 py-2 border rounded-lg" value={compForm.name} onChange={e => setCompForm({...compForm, name: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Category</label><select className="w-full px-3 py-2 border rounded-lg" value={compForm.category_id} onChange={e => setCompForm({...compForm, category_id: e.target.value})}><option value="">Select...</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea className="w-full px-3 py-2 border rounded-lg" rows="2" value={compForm.description} onChange={e => setCompForm({...compForm, description: e.target.value})} /></div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : editingComp ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => setEditCompModal(false)} className="flex-1 bg-gray-200 px-4 py-2.5 rounded-lg hover:bg-gray-300">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
