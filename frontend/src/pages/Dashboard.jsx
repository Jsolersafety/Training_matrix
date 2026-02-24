import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, BookOpen, LayoutGrid, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { fetchDashboardStats, fetchExpiringTraining } from '../api/client'
import { StatCard, Spinner, StatusBadge } from '../components/ui'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [expiring, setExpiring] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchExpiringTraining(30)])
      .then(([s, e]) => { setStats(s); setExpiring(e) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Staff Members" value={stats?.total_people || 0} color="blue" />
        <StatCard label="Roles" value={stats?.total_roles || 0} color="purple" />
        <StatCard label="Competencies" value={stats?.total_competencies || 0} color="blue" />
        <StatCard label="Training Records" value={stats?.total_records || 0} color="green" />
        <StatCard label="Expiring Soon" value={stats?.expiring_count || 0} color="amber" />
        <StatCard label="Expired" value={stats?.expired_count || 0} color="red" />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/matrix" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <LayoutGrid className="text-blue-500 mb-2" size={28} />
          <h3 className="font-bold text-lg">Competency Matrix</h3>
          <p className="text-sm text-gray-600">View and edit role-competency requirements</p>
        </Link>
        <Link to="/people" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <Users className="text-green-500 mb-2" size={28} />
          <h3 className="font-bold text-lg">People & Records</h3>
          <p className="text-sm text-gray-600">Manage staff and training records</p>
        </Link>
        <Link to="/courses" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <BookOpen className="text-purple-500 mb-2" size={28} />
          <h3 className="font-bold text-lg">Training Courses</h3>
          <p className="text-sm text-gray-600">Manage internal and external courses</p>
        </Link>
      </div>

      {/* Expiring Training */}
      {expiring.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={20} />
            Training Expiring Within 30 Days
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3">Person</th>
                  <th className="text-left p-3">Competency</th>
                  <th className="text-left p-3">Expiry Date</th>
                  <th className="text-left p-3">Days Left</th>
                </tr>
              </thead>
              <tbody>
                {expiring.slice(0, 10).map((item, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{item.person_name}</td>
                    <td className="p-3">{item.competency_name}</td>
                    <td className="p-3">{new Date(item.expiry_date).toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${item.days_until_expiry <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {item.days_until_expiry} days
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
