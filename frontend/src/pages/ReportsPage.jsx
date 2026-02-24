import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronUp, ExternalLink, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { fetchComplianceReport, fetchComplianceDetail, fetchDepartmentSummary, fetchExpiringTraining, fetchDepartments } from '../api/client'
import { Spinner, EmptyState } from '../components/ui'

export default function ReportsPage() {
  const [tab, setTab] = useState('compliance')
  const [compliance, setCompliance] = useState([])
  const [deptSummary, setDeptSummary] = useState([])
  const [expiring, setExpiring] = useState([])
  const [departments, setDepartments] = useState([])
  const [filterDept, setFilterDept] = useState('')
  const [loading, setLoading] = useState(true)

  // Drilldown state
  const [expandedPerson, setExpandedPerson] = useState(null)
  const [personDetail, setPersonDetail] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailFilter, setDetailFilter] = useState('all') // all, complete, missing, expired, expiring

  useEffect(() => {
    Promise.all([fetchDepartments(), fetchComplianceReport(), fetchDepartmentSummary(), fetchExpiringTraining(60)])
      .then(([d, c, ds, e]) => { setDepartments(d); setCompliance(c); setDeptSummary(ds); setExpiring(e) })
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false))
  }, [])

  const togglePerson = async (personId) => {
    if (expandedPerson === personId) {
      setExpandedPerson(null)
      return
    }
    setExpandedPerson(personId)
    setLoadingDetail(true)
    setDetailFilter('all')
    try {
      const detail = await fetchComplianceDetail(personId)
      setPersonDetail(detail)
    } catch { toast.error('Failed to load details') }
    setLoadingDetail(false)
  }

  const filteredCompliance = filterDept
    ? compliance.filter(c => c.department_name === filterDept)
    : compliance

  const filteredDetail = detailFilter === 'all'
    ? personDetail
    : personDetail.filter(d => d.status === detailFilter)

  const statusIcon = (status) => {
    switch (status) {
      case 'complete': return <CheckCircle size={14} className="text-green-500" />
      case 'expired': return <XCircle size={14} className="text-red-500" />
      case 'expiring': return <AlertTriangle size={14} className="text-amber-500" />
      case 'missing': return <Clock size={14} className="text-gray-400" />
      default: return null
    }
  }

  const statusBadge = (status) => {
    const cls = {
      complete: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
      expiring: 'bg-amber-100 text-amber-700',
      missing: 'bg-gray-100 text-gray-600',
    }
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls[status] || ''}`}>{status}</span>
  }

  const reqBadge = (type) => {
    const cls = {
      'M(A)': 'bg-red-100 text-red-700',
      'M(S)': 'bg-red-50 text-red-600',
      'D(A)': 'bg-blue-100 text-blue-700',
      'D(S)': 'bg-blue-50 text-blue-600',
      'LM': 'bg-orange-100 text-orange-700',
    }
    return <span className={`px-1.5 py-0.5 rounded text-xs ${cls[type] || 'bg-gray-100'}`}>{type}</span>
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b">
          {[['compliance', 'Staff Compliance'], ['departments', 'Department Summary'], ['expiring', 'Expiring Training']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`px-6 py-3 font-medium text-sm ${tab === key ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}>{label}</button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'compliance' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">Staff Compliance Report</h3>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400">Click a row to drill down</span>
                  <select className="px-3 py-2 border rounded text-sm" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              {filteredCompliance.length === 0 ? <EmptyState message="No data" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
                      <th className="text-left p-3 w-8"></th>
                      <th className="text-left p-3">Name</th>
                      <th className="text-left p-3">Role</th>
                      <th className="text-left p-3">Department</th>
                      <th className="text-center p-3">Required</th>
                      <th className="text-center p-3">Completed</th>
                      <th className="text-center p-3">Expired</th>
                      <th className="text-center p-3">Expiring</th>
                      <th className="text-center p-3">Compliance</th>
                    </tr></thead>
                    <tbody>{filteredCompliance.map(row => (
                      <React.Fragment key={row.person_id}>
                        <tr
                          onClick={() => togglePerson(row.person_id)}
                          className={`border-b cursor-pointer transition-colors ${expandedPerson === row.person_id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="p-3 text-gray-400">
                            {expandedPerson === row.person_id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </td>
                          <td className="p-3 font-medium">{row.person_name}</td>
                          <td className="p-3">{row.role_name}</td>
                          <td className="p-3">{row.department_name}</td>
                          <td className="p-3 text-center">{row.required_count}</td>
                          <td className="p-3 text-center text-green-600 font-bold">{row.completed_count}</td>
                          <td className="p-3 text-center text-red-600 font-bold">{row.expired_count}</td>
                          <td className="p-3 text-center text-amber-600 font-bold">{row.expiring_count}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${row.compliance_percentage >= 80 ? 'bg-green-100 text-green-700' : row.compliance_percentage >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {row.compliance_percentage}%
                            </span>
                          </td>
                        </tr>

                        {/* Drilldown Panel */}
                        {expandedPerson === row.person_id && (
                          <tr>
                            <td colSpan={9} className="p-0">
                              <div className="bg-blue-50 border-t border-b border-blue-200 p-4">
                                {loadingDetail ? (
                                  <div className="text-center py-4"><Spinner /></div>
                                ) : (
                                  <div>
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="font-bold text-sm text-gray-700">
                                        {row.person_name} — Competency Breakdown ({filteredDetail.length} of {personDetail.length})
                                      </h4>
                                      <div className="flex gap-1">
                                        {[
                                          ['all', 'All', 'bg-gray-200 text-gray-700'],
                                          ['complete', 'Complete', 'bg-green-100 text-green-700'],
                                          ['missing', 'Missing', 'bg-gray-100 text-gray-600'],
                                          ['expired', 'Expired', 'bg-red-100 text-red-700'],
                                          ['expiring', 'Expiring', 'bg-amber-100 text-amber-700'],
                                        ].map(([key, label, cls]) => {
                                          const count = key === 'all' ? personDetail.length : personDetail.filter(d => d.status === key).length
                                          return (
                                            <button key={key} onClick={() => setDetailFilter(key)}
                                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${detailFilter === key ? cls + ' ring-2 ring-offset-1 ring-blue-400' : 'bg-white text-gray-500 hover:bg-gray-100'}`}>
                                              {label} ({count})
                                            </button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                    {filteredDetail.length === 0 ? (
                                      <p className="text-center text-gray-400 py-4 text-sm">No competencies match this filter</p>
                                    ) : (
                                      <table className="w-full text-xs bg-white rounded-lg overflow-hidden">
                                        <thead><tr className="bg-gray-100 text-gray-600">
                                          <th className="text-left p-2">Status</th>
                                          <th className="text-left p-2">Competency</th>
                                          <th className="text-center p-2">Req. Type</th>
                                          <th className="text-left p-2">Completed</th>
                                          <th className="text-left p-2">Expiry</th>
                                          <th className="text-left p-2">Course/Provider</th>
                                          <th className="text-left p-2">Certificate</th>
                                          <th className="text-left p-2">CM10</th>
                                        </tr></thead>
                                        <tbody>{filteredDetail.map((d, i) => (
                                          <tr key={i} className={`border-b last:border-b-0 ${d.status === 'missing' ? 'bg-gray-50' : d.status === 'expired' ? 'bg-red-50' : d.status === 'expiring' ? 'bg-amber-50' : ''}`}>
                                            <td className="p-2">
                                              <div className="flex items-center gap-1.5">
                                                {statusIcon(d.status)}
                                                {statusBadge(d.status)}
                                              </div>
                                            </td>
                                            <td className="p-2 font-medium">{d.competency_name}</td>
                                            <td className="p-2 text-center">{reqBadge(d.requirement_type)}</td>
                                            <td className="p-2">{d.completed_date ? new Date(d.completed_date).toLocaleDateString() : <span className="text-gray-400">—</span>}</td>
                                            <td className="p-2">{d.expiry_date ? new Date(d.expiry_date).toLocaleDateString() : <span className="text-gray-400">No expiry</span>}</td>
                                            <td className="p-2">{d.course_name || d.provider_name || <span className="text-gray-400">—</span>}</td>
                                            <td className="p-2">{d.certificate_number || <span className="text-gray-400">—</span>}</td>
                                            <td className="p-2">
                                              {d.cm10_link ? (
                                                <a href={d.cm10_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                                  CM10 <ExternalLink size={10} />
                                                </a>
                                              ) : <span className="text-gray-400">—</span>}
                                            </td>
                                          </tr>
                                        ))}</tbody>
                                      </table>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'departments' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Department Training Summary</h3>
              {deptSummary.length === 0 ? <EmptyState message="No data" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deptSummary.map(dept => (
                    <div key={dept.department_name} className="border rounded-lg p-4">
                      <h4 className="font-bold mb-2">{dept.department_name}</h4>
                      <div className="text-sm space-y-1">
                        <p>Staff: <strong>{dept.total_people}</strong></p>
                        <p>Required: <strong>{dept.total_required}</strong></p>
                        <p>Completed: <strong className="text-green-600">{dept.total_completed}</strong></p>
                        <p>Expired: <strong className="text-red-600">{dept.total_expired}</strong></p>
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Compliance</span>
                            <span className="font-bold">{dept.compliance_percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className={`h-2 rounded-full ${dept.compliance_percentage >= 80 ? 'bg-green-500' : dept.compliance_percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, dept.compliance_percentage)}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'expiring' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Training Expiring Within 60 Days</h3>
              {expiring.length === 0 ? <EmptyState message="No expiring training - looking good!" /> : (
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Person</th>
                    <th className="text-left p-3">Competency</th>
                    <th className="text-left p-3">Expiry Date</th>
                    <th className="text-left p-3">Days Left</th>
                  </tr></thead>
                  <tbody>{expiring.map((item, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{item.person_name}</td>
                      <td className="p-3">{item.competency_name}</td>
                      <td className="p-3">{new Date(item.expiry_date).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${item.days_until_expiry <= 7 ? 'bg-red-100 text-red-700' : item.days_until_expiry <= 30 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {item.days_until_expiry} days
                        </span>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
