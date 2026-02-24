import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import MatrixPage from './pages/MatrixPage'
import CoursesPage from './pages/CoursesPage'
import PeoplePage from './pages/PeoplePage'
import ReportsPage from './pages/ReportsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/matrix" element={<MatrixPage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  )
}
