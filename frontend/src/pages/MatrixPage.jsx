import React, { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import { fetchMatrix, updateMatrixCell } from '../api/client'
import { Modal, RequirementBadge, Spinner } from '../components/ui'

export default function MatrixPage() {
  const [matrix, setMatrix] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterReq, setFilterReq] = useState('')
  const [search, setSearch] = useState('')
  const [editModal, setEditModal] = useState(null)
  const [editReq, setEditReq] = useState('')

  useEffect(() => {
    fetchMatrix().then(setMatrix).catch(() => toast.error('Failed to load matrix')).finally(() => setLoading(false))
  }, [])

  const departments = useMemo(() => {
    if (!matrix) return []
    return [...new Set(matrix.roles.map(r => r.department?.name).filter(Boolean))].sort()
  }, [matrix])

  const categories = useMemo(() => {
    if (!matrix) return []
    return [...new Set(matrix.competencies.map(c => c.category?.name).filter(Boolean))].sort()
  }, [matrix])

  const filteredRoles = useMemo(() => {
    if (!matrix) return []
    let r = matrix.roles
    if (filterDept) r = r.filter(x => x.department?.name === filterDept)
    if (search) r = r.filter(x => x.name.toLowerCase().includes(search.toLowerCase()))
    return r
  }, [matrix, filterDept, search])

  const filteredComps = useMemo(() => {
    if (!matrix) return []
    let c = matrix.competencies
    if (filterCat) c = c.filter(x => x.category?.name === filterCat)
    if (filterReq) c = c.filter(x => {
      const reqs = matrix.requirements[String(x.id)] || {}
      return Object.values(reqs).some(r => r === filterReq)
    })
    if (search) c = c.filter(x => x.name.toLowerCase().includes(search.toLowerCase()))
    return c
  }, [matrix, filterCat, filterReq, search])

  const handleCellClick = (comp, role) => {
    const req = matrix.requirements[String(comp.id)]?.[String(role.id)] || ''
    setEditReq(req)
    setEditModal({ comp, role })
  }

  const handleSaveCell = async () => {
    try {
      await updateMatrixCell({ role_id: editModal.role.id, competency_id: editModal.comp.id, requirement_type: editReq || null })
      setMatrix(prev => {
        const reqs = { ...prev.requirements }
        const ck = String(editModal.comp.id), rk = String(editModal.role.id)
        if (!reqs[ck]) reqs[ck] = {}
        if (editReq) reqs[ck][rk] = editReq; else delete reqs[ck][rk]
        return { ...prev, requirements: reqs }
      })
      toast.success('Updated')
      setEditModal(null)
    } catch { toast.error('Failed to update') }
  }

  if (loading) return <Spinner />

  const displayRoles = filteredRoles.slice(0, 25)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Competency Requirements Matrix</h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          <select className="px-2 py-1.5 border rounded text-sm" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d}>{d}</option>)}
          </select>
          <select className="px-2 py-1.5 border rounded text-sm" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="px-2 py-1.5 border rounded text-sm" value={filterReq} onChange={e => setFilterReq(e.target.value)}>
            <option value="">All Requirements</option>
            {['M(A)','M(S)','D(A)','D(S)','LM'].map(r => <option key={r}>{r}</option>)}
          </select>
          <input type="text" className="px-2 py-1.5 border rounded text-sm" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          <button onClick={() => { setFilterDept(''); setFilterCat(''); setFilterReq(''); setSearch('') }} className="bg-gray-200 px-3 py-1.5 rounded text-sm hover:bg-gray-300">Clear</button>
        </div>

        <div className="flex gap-3 mb-3 text-xs flex-wrap">
          {[['M(A)','Mandatory (All)','bg-red-500'],['M(S)','Mandatory (Specific)','bg-red-500'],['D(A)','Desirable (All)','bg-blue-500'],['D(S)','Desirable (Specific)','bg-blue-500'],['LM','License Mandatory','bg-orange-500']].map(([code,label,bg]) => (
            <div key={code} className="flex items-center gap-1"><span className={`px-2 py-1 rounded text-white font-semibold ${bg}`}>{code}</span> {label}</div>
          ))}
        </div>

        <p className="text-xs text-gray-600 mb-3">Showing {filteredComps.length} competencies × {displayRoles.length} roles. Click any cell to edit.</p>

        <div className="overflow-auto" style={{ maxHeight: '600px' }}>
          <table className="w-full border-collapse border text-xs" style={{ tableLayout: 'auto' }}>
            <thead className="sticky top-0 bg-gray-100 z-10">
              <tr>
                <th className="border p-2 text-left bg-gray-100 sticky left-0 z-20" style={{ minWidth: 200 }}>Competency</th>
                <th className="border p-2 text-left bg-gray-100 sticky z-20" style={{ left: 200, minWidth: 100 }}>Category</th>
                {displayRoles.map(role => (
                  <th key={role.id} className="border p-1 bg-gray-100" style={{ minWidth: 80 }}>
                    <div className="font-semibold">{role.name}</div>
                    <div className="text-gray-500 font-normal">{role.department?.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredComps.map((comp, idx) => (
                <tr key={comp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border p-2 font-medium sticky left-0 z-[1]" style={{ background: 'inherit' }}>{comp.name}</td>
                  <td className="border p-2 text-gray-600 sticky z-[1]" style={{ left: 200, background: 'inherit' }}>{comp.category?.name}</td>
                  {displayRoles.map(role => {
                    const req = matrix.requirements[String(comp.id)]?.[String(role.id)]
                    return (
                      <td key={role.id} className="border p-1 text-center">
                        <button onClick={() => handleCellClick(comp, role)} className="w-full hover:bg-gray-200 p-1 rounded">
                          <RequirementBadge type={req} />
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredRoles.length > 25 && <p className="text-xs text-gray-500 mt-2">Showing first 25 of {filteredRoles.length} roles. Use filters to narrow.</p>}
      </div>

      {/* Edit Cell Modal */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Edit Requirement" size="sm">
        {editModal && (
          <div>
            <div className="mb-4 text-sm">
              <p><strong>Competency:</strong> {editModal.comp.name}</p>
              <p><strong>Role:</strong> {editModal.role.name}</p>
            </div>
            <select className="w-full px-3 py-2 border rounded-lg mb-4" value={editReq} onChange={e => setEditReq(e.target.value)}>
              <option value="">None</option>
              <option value="M(A)">M(A) - Mandatory (All)</option>
              <option value="M(S)">M(S) - Mandatory (Specific)</option>
              <option value="D(A)">D(A) - Desirable (All)</option>
              <option value="D(S)">D(S) - Desirable (Specific)</option>
              <option value="LM">LM - License Mandatory</option>
            </select>
            <div className="flex gap-3">
              <button onClick={handleSaveCell} className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">Save</button>
              <button onClick={() => setEditModal(null)} className="flex-1 bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400">Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
