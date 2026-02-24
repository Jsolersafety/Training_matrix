import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { fetchCourses, createCourse, updateCourse, deleteCourse, fetchCompetencies } from '../api/client'
import { Modal, Spinner, EmptyState } from '../components/ui'

export default function CoursesPage() {
  const [courses, setCourses] = useState([])
  const [competencies, setCompetencies] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(getEmptyForm())

  function getEmptyForm() {
    return { name: '', provider_type: 'external', provider_name: '', recertification_months: '', cost: '', duration: '', notes: '', website_url: '', contact_phone: '', contact_email: '', linked_competency_ids: [] }
  }

  useEffect(() => {
    Promise.all([fetchCourses(), fetchCompetencies()])
      .then(([c, comp]) => { setCourses(c); setCompetencies(comp) })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const openCreate = () => { setEditing(null); setForm(getEmptyForm()); setModalOpen(true) }
  const openEdit = (course) => {
    setEditing(course)
    setForm({
      name: course.name, provider_type: course.provider_type, provider_name: course.provider_name,
      recertification_months: course.recertification_months || '', cost: course.cost || '',
      duration: course.duration || '', notes: course.notes || '', website_url: course.website_url || '',
      contact_phone: course.contact_phone || '', contact_email: course.contact_email || '',
      linked_competency_ids: course.linked_competency_ids || [],
    })
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const data = {
      ...form,
      recertification_months: form.recertification_months ? parseInt(form.recertification_months) : null,
      cost: form.cost ? parseFloat(form.cost) : 0,
    }
    try {
      if (editing) {
        const updated = await updateCourse(editing.id, data)
        setCourses(prev => prev.map(c => c.id === editing.id ? updated : c))
        toast.success('Course updated')
      } else {
        const created = await createCourse(data)
        setCourses(prev => [...prev, created])
        toast.success('Course created')
      }
      setModalOpen(false)
    } catch { toast.error('Failed to save') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this course?')) return
    try {
      await deleteCourse(id)
      setCourses(prev => prev.filter(c => c.id !== id))
      toast.success('Deleted')
    } catch { toast.error('Failed to delete') }
  }

  const toggleCompetency = (compId) => {
    setForm(prev => ({
      ...prev,
      linked_competency_ids: prev.linked_competency_ids.includes(compId)
        ? prev.linked_competency_ids.filter(id => id !== compId)
        : [...prev.linked_competency_ids, compId]
    }))
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between mb-6">
          <h2 className="text-xl font-bold">Training Courses ({courses.length})</h2>
          <button onClick={openCreate} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">+ Add Course</button>
        </div>
        {courses.length === 0 ? <EmptyState message="No courses yet" /> : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {courses.map(course => (
              <div key={course.id} className="border rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <h3 className="font-bold text-sm">{course.name}</h3>
                  <button onClick={() => handleDelete(course.id)} className="text-red-500 hover:text-red-700">×</button>
                </div>
                <div className="text-xs space-y-1 mb-3">
                  <span className={`inline-block px-2 py-1 rounded ${course.provider_type === 'internal' ? 'badge-internal' : 'badge-external'}`}>
                    {course.provider_type === 'internal' ? 'Internal' : 'External'}
                  </span>
                  <p><strong>Provider:</strong> {course.provider_name}</p>
                  {course.duration && <p><strong>Duration:</strong> {course.duration}</p>}
                  {course.recertification_months && <p><strong>Recert:</strong> {course.recertification_months} months</p>}
                  {course.cost > 0 && <p><strong>Cost:</strong> ${Number(course.cost).toFixed(2)}</p>}
                  {course.website_url && <p><a href={course.website_url} target="_blank" rel="noopener" className="text-blue-500 hover:underline">Website</a></p>}
                </div>
                <button onClick={() => openEdit(course)} className="w-full bg-gray-100 px-3 py-1 rounded text-xs hover:bg-gray-200">Edit</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Course' : 'Add Course'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Course Name *</label>
              <input required className="w-full px-3 py-2 border rounded-lg" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Provider Type</label>
              <select className="w-full px-3 py-2 border rounded-lg" value={form.provider_type} onChange={e => setForm({...form, provider_type: e.target.value})}>
                <option value="internal">Internal</option>
                <option value="external">External</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Provider Name *</label>
              <input required className="w-full px-3 py-2 border rounded-lg" value={form.provider_name} onChange={e => setForm({...form, provider_name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Recertification (months)</label>
              <input type="number" min="1" className="w-full px-3 py-2 border rounded-lg" value={form.recertification_months} onChange={e => setForm({...form, recertification_months: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Duration</label>
              <input className="w-full px-3 py-2 border rounded-lg" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cost ($)</label>
              <input type="number" min="0" step="0.01" className="w-full px-3 py-2 border rounded-lg" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input type="url" className="w-full px-3 py-2 border rounded-lg" value={form.website_url} onChange={e => setForm({...form, website_url: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Phone</label>
              <input className="w-full px-3 py-2 border rounded-lg" value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input type="email" className="w-full px-3 py-2 border rounded-lg" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Linked Competencies</label>
              <div className="bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
                {competencies.map(comp => (
                  <label key={comp.id} className="flex items-center gap-2 text-sm p-1 hover:bg-white rounded cursor-pointer">
                    <input type="checkbox" checked={form.linked_competency_ids.includes(comp.id)} onChange={() => toggleCompetency(comp.id)} />
                    <span>{comp.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea className="w-full px-3 py-2 border rounded-lg" rows="2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">{editing ? 'Update' : 'Add'}</button>
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
