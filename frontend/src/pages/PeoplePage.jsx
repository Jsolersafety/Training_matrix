import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { fetchPeople, createPerson, updatePerson, deletePerson, importCSV, fetchRoles, fetchDepartments, fetchRecords, createRecord, fetchCourses, fetchCompetencies, uploadCertificate } from '../api/client'
import { Modal, Spinner, EmptyState, StatusBadge } from '../components/ui'

export default function PeoplePage() {
  const [people, setPeople] = useState([])
  const [roles, setRoles] = useState([])
  const [departments, setDepartments] = useState([])
  const [courses, setCourses] = useState([])
  const [competencies, setCompetencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [personModal, setPersonModal] = useState(false)
  const [csvModal, setCsvModal] = useState(false)
  const [recordModal, setRecordModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [personForm, setPersonForm] = useState({ first_name: '', last_name: '', email: '', phone: '', role_id: '', department_id: '', employee_number: '', usi: '', dob: '', secondary_roles: [] })
  const [recordForm, setRecordForm] = useState({ competency_id: '', course_id: '', completed_date: '', expiry_date: '', certificate_number: '', notes: '' })

  useEffect(() => {
    Promise.all([fetchPeople({}), fetchRoles(), fetchDepartments(), fetchCourses(), fetchCompetencies()])
      .then(([p, r, d, co, comp]) => { setPeople(p); setRoles(r); setDepartments(d); setCourses(co); setCompetencies(comp) })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const filteredPeople = people.filter(p => {
    if (search && !`${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())) return false
    if (filterDept && p.department_id !== parseInt(filterDept)) return false
    return true
  })

  const openCreatePerson = () => {
    setEditing(null)
    setPersonForm({ first_name: '', last_name: '', email: '', phone: '', role_id: '', department_id: '', employee_number: '', usi: '', dob: '', secondary_roles: [] })
    setPersonModal(true)
  }

  const openEditPerson = (person) => {
    setEditing(person)
    setPersonForm({ first_name: person.first_name, last_name: person.last_name, email: person.email || '', phone: person.phone || '', role_id: person.role_id || '', department_id: person.department_id || '', employee_number: person.employee_number || '', usi: person.usi || '', dob: person.dob || '', secondary_roles: person.secondary_roles || [] })
    setPersonModal(true)
  }

  const handleSavePerson = async (e) => {
    e.preventDefault()
    const data = { ...personForm, role_id: personForm.role_id ? parseInt(personForm.role_id) : null, department_id: personForm.department_id ? parseInt(personForm.department_id) : null, dob: personForm.dob || null }
    try {
      if (editing) {
        const updated = await updatePerson(editing.id, data)
        setPeople(prev => prev.map(p => p.id === editing.id ? updated : p))
        toast.success('Updated')
      } else {
        const created = await createPerson(data)
        setPeople(prev => [...prev, created])
        toast.success('Created')
      }
      setPersonModal(false)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save') }
  }

  const handleDeletePerson = async (id) => {
    if (!confirm('Delete this person?')) return
    try { await deletePerson(id); setPeople(prev => prev.filter(p => p.id !== id)); toast.success('Deleted') } catch { toast.error('Failed') }
  }

  const viewTraining = async (person) => {
    setSelectedPerson(person)
    try {
      const recs = await fetchRecords({ person_id: person.id })
      setRecords(recs)
    } catch { toast.error('Failed to load records') }
  }

  const handleCSV = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const result = await importCSV(file)
      toast.success(`Imported ${result.imported}, skipped ${result.skipped}`)
      if (result.errors.length) result.errors.forEach(err => toast.error(err))
      const updated = await fetchPeople({})
      setPeople(updated)
      setCsvModal(false)
    } catch { toast.error('CSV import failed') }
  }

  const openRecordModal = () => {
    setRecordForm({ competency_id: '', course_id: '', completed_date: new Date().toISOString().split('T')[0], expiry_date: '', certificate_number: '', cm10_link: '', notes: '' })
    setRecordModal(true)
  }

  const handleSaveRecord = async (e) => {
    e.preventDefault()
    try {
      const data = {
        person_id: selectedPerson.id,
        competency_id: parseInt(recordForm.competency_id),
        course_id: recordForm.course_id ? parseInt(recordForm.course_id) : null,
        completed_date: recordForm.completed_date,
        expiry_date: recordForm.expiry_date || null,
        certificate_number: recordForm.certificate_number || null,
        provider_name: recordForm.provider_name || null,
        cost: recordForm.cost ? parseFloat(recordForm.cost) : null,
        cm10_link: recordForm.cm10_link || null,
        notes: recordForm.notes || null,
      }
      const created = await createRecord(data)
      setRecords(prev => [...prev, created])
      toast.success('Record added')
      setRecordModal(false)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save record') }
  }

  const getStatus = (record) => {
    if (!record) return 'pending'
    if (!record.expiry_date) return 'complete'
    const days = Math.floor((new Date(record.expiry_date) - new Date()) / 86400000)
    if (days < 0) return 'expired'
    if (days <= 30) return 'expiring'
    return 'complete'
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {/* People List */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Staff Members ({filteredPeople.length})</h2>
          <div className="flex gap-2">
            <button onClick={openCreatePerson} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm">+ Add Person</button>
            <button onClick={() => setCsvModal(true)} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm">Upload CSV</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <input type="text" placeholder="Search by name..." className="px-3 py-2 border rounded-lg text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="px-3 py-2 border rounded-lg text-sm" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button onClick={() => { setSearch(''); setFilterDept('') }} className="bg-gray-200 px-3 py-2 rounded-lg text-sm">Clear</button>
        </div>
        {filteredPeople.length === 0 ? <EmptyState message="No staff members found" /> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredPeople.map(person => (
              <div key={person.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold">{person.first_name} {person.last_name}</h3>
                    <p className="text-sm text-gray-600">{person.role?.name || 'No role'}</p>
                    <p className="text-xs text-gray-500">{person.department?.name}</p>
                    {person.email && <p className="text-xs text-gray-500 mt-1">{person.email}</p>}
                    {person.secondary_roles?.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {person.secondary_roles.map(r => <span key={r} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{r}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditPerson(person)} className="text-blue-500 text-xs hover:underline">Edit</button>
                    <button onClick={() => handleDeletePerson(person.id)} className="text-red-500 text-xs hover:underline">Del</button>
                  </div>
                </div>
                <button onClick={() => viewTraining(person)} className="w-full mt-2 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600">View Training</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Training Records Panel */}
      {selectedPerson && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between mb-4">
            <h2 className="text-xl font-bold">{selectedPerson.first_name} {selectedPerson.last_name} — Training Records</h2>
            <div className="flex gap-2">
              <button onClick={openRecordModal} className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600">+ Add Record</button>
              <button onClick={() => setSelectedPerson(null)} className="text-gray-500 hover:text-gray-700">Close</button>
            </div>
          </div>
          {records.length === 0 ? <EmptyState message="No training records yet" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50">
                  <th className="text-left p-3">Competency</th>
                  <th className="text-left p-3">Course</th>
                  <th className="text-left p-3">Completed</th>
                  <th className="text-left p-3">Expiry</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Certificate</th>
                  <th className="text-left p-3">CM10</th>
                </tr></thead>
                <tbody>{records.map(rec => {
                  const comp = competencies.find(c => c.id === rec.competency_id)
                  return (
                    <tr key={rec.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{comp?.name || `#${rec.competency_id}`}</td>
                      <td className="p-3">{rec.course?.name || rec.provider_name || '-'}</td>
                      <td className="p-3">{new Date(rec.completed_date).toLocaleDateString()}</td>
                      <td className="p-3">{rec.expiry_date ? new Date(rec.expiry_date).toLocaleDateString() : 'No expiry'}</td>
                      <td className="p-3"><StatusBadge status={getStatus(rec)} /></td>
                      <td className="p-3">{rec.certificate_number || '-'}</td>
                      <td className="p-3">{rec.cm10_link ? <a href={rec.cm10_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">Open CM10</a> : '-'}</td>
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Person Modal */}
      <Modal isOpen={personModal} onClose={() => setPersonModal(false)} title={editing ? 'Edit Person' : 'Add Person'} size="lg">
        <form onSubmit={handleSavePerson} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">First Name *</label><input required className="w-full px-3 py-2 border rounded-lg" value={personForm.first_name} onChange={e => setPersonForm({...personForm, first_name: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1">Last Name *</label><input required className="w-full px-3 py-2 border rounded-lg" value={personForm.last_name} onChange={e => setPersonForm({...personForm, last_name: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" className="w-full px-3 py-2 border rounded-lg" value={personForm.email} onChange={e => setPersonForm({...personForm, email: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1">Phone</label><input className="w-full px-3 py-2 border rounded-lg" value={personForm.phone} onChange={e => setPersonForm({...personForm, phone: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1">Role</label><select className="w-full px-3 py-2 border rounded-lg" value={personForm.role_id} onChange={e => setPersonForm({...personForm, role_id: e.target.value})}><option value="">Select...</option>{roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Department</label><select className="w-full px-3 py-2 border rounded-lg" value={personForm.department_id} onChange={e => setPersonForm({...personForm, department_id: e.target.value})}><option value="">Select...</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Employee #</label><input className="w-full px-3 py-2 border rounded-lg" value={personForm.employee_number} onChange={e => setPersonForm({...personForm, employee_number: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1">USI</label><input className="w-full px-3 py-2 border rounded-lg" value={personForm.usi} onChange={e => setPersonForm({...personForm, usi: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1">Date of Birth</label><input type="date" className="w-full px-3 py-2 border rounded-lg" value={personForm.dob} onChange={e => setPersonForm({...personForm, dob: e.target.value})} /></div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">{editing ? 'Update' : 'Add'}</button>
            <button type="button" onClick={() => setPersonModal(false)} className="flex-1 bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
          </div>
        </form>
      </Modal>

      {/* CSV Modal */}
      <Modal isOpen={csvModal} onClose={() => setCsvModal(false)} title="Upload CSV" size="sm">
        <p className="text-sm text-gray-600 mb-4">CSV should have columns: first_name, last_name, email, phone, role_name, department_name, employee_number</p>
        <input type="file" accept=".csv" onChange={handleCSV} className="w-full" />
      </Modal>

      {/* Record Modal */}
      <Modal isOpen={recordModal} onClose={() => setRecordModal(false)} title="Add Training Record" size="md">
        <form onSubmit={handleSaveRecord} className="space-y-4">
          <div><label className="block text-sm font-medium mb-1">Competency *</label><select required className="w-full px-3 py-2 border rounded-lg" value={recordForm.competency_id} onChange={e => setRecordForm({...recordForm, competency_id: e.target.value})}><option value="">Select...</option>{competencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Course</label><select className="w-full px-3 py-2 border rounded-lg" value={recordForm.course_id} onChange={e => setRecordForm({...recordForm, course_id: e.target.value})}><option value="">None</option>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Completed Date *</label><input type="date" required className="w-full px-3 py-2 border rounded-lg" value={recordForm.completed_date} onChange={e => setRecordForm({...recordForm, completed_date: e.target.value})} /></div>
            <div><label className="block text-sm font-medium mb-1">Expiry Date</label><input type="date" className="w-full px-3 py-2 border rounded-lg" value={recordForm.expiry_date} onChange={e => setRecordForm({...recordForm, expiry_date: e.target.value})} /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Certificate #</label><input className="w-full px-3 py-2 border rounded-lg" value={recordForm.certificate_number} onChange={e => setRecordForm({...recordForm, certificate_number: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">CM10 Link</label><input type="url" className="w-full px-3 py-2 border rounded-lg" placeholder="https://..." value={recordForm.cm10_link} onChange={e => setRecordForm({...recordForm, cm10_link: e.target.value})} /></div>
          <div><label className="block text-sm font-medium mb-1">Notes</label><textarea className="w-full px-3 py-2 border rounded-lg" rows="2" value={recordForm.notes} onChange={e => setRecordForm({...recordForm, notes: e.target.value})} /></div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Save</button>
            <button type="button" onClick={() => setRecordModal(false)} className="flex-1 bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
