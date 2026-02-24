import React, { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { fetchComplianceReport, fetchDepartmentSummary, fetchExpiringTraining, fetchDepartments } from '../api/client'
import { Spinner, EmptyState, StatusBadge } from '../components/ui'

export default function ReportsPage() {
  const [tab, setTab] = useState('compliance')
  const [compliance, setCompliance] = useState([])
  const [deptSummary, setDeptSummary] = useState([])
  const [expiring, setExpiring] = useState([])
  const [departments, setDepartments] = useState([])
  const [filterDept, setFilterDept] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchDepartments(), fetchComplianceReport(), fetchDepartmentSummary(), fetchExpiringTraining(60)])
      .then(([d, c, ds, e]) => { setDepartments(d); setCompliance(c); setDeptSummary(ds); setExpiring(e) })
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false))
  }, [])

  const filteredCompliance = filterDept
    ? compliance.filter(c => c.department_name === filterDept)
    : compliance

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
                <select className="px-3 py-2 border rounded text-sm" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              {filteredCompliance.length === 0 ? <EmptyState message="No data" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-gray-50">
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
                      <tr key={row.person_id} className="border-b hover:bg-gray-50">
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
