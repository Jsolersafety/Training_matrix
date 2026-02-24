import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Departments ─────────────────────────────────────────────
export const fetchDepartments = () => api.get('/departments').then(r => r.data)
export const createDepartment = (data) => api.post('/departments', data).then(r => r.data)

// ── Roles ───────────────────────────────────────────────────
export const fetchRoles = (deptId) => api.get('/roles', { params: deptId ? { department_id: deptId } : {} }).then(r => r.data)
export const createRole = (data) => api.post('/roles', data).then(r => r.data)
export const updateRole = (id, data) => api.put(`/roles/${id}`, data).then(r => r.data)
export const deleteRole = (id) => api.delete(`/roles/${id}`)
export const fetchRoleCompetencies = (id) => api.get(`/roles/${id}/competencies`).then(r => r.data)
export const setRoleCompetencies = (id, data) => api.put(`/roles/${id}/competencies`, data).then(r => r.data)

// ── Competencies ────────────────────────────────────────────
export const fetchCompetencies = (catId) => api.get('/competencies', { params: catId ? { category_id: catId } : {} }).then(r => r.data)
export const fetchCompetency = (id) => api.get(`/competencies/${id}`).then(r => r.data)
export const createCompetency = (data) => api.post('/competencies', data).then(r => r.data)
export const updateCompetency = (id, data) => api.put(`/competencies/${id}`, data).then(r => r.data)
export const deleteCompetency = (id) => api.delete(`/competencies/${id}`)

export const fetchCategories = () => api.get('/competencies/categories').then(r => r.data)
export const createCategory = (data) => api.post('/competencies/categories', data).then(r => r.data)

// ── Matrix ──────────────────────────────────────────────────
export const fetchMatrix = () => api.get('/matrix').then(r => r.data)
export const updateMatrixCell = (data) => api.put('/matrix/cell', data).then(r => r.data)
export const bulkUpdateMatrix = (data) => api.put('/matrix/bulk', data).then(r => r.data)

// ── Courses ─────────────────────────────────────────────────
export const fetchCourses = () => api.get('/courses').then(r => r.data)
export const fetchCourse = (id) => api.get(`/courses/${id}`).then(r => r.data)
export const createCourse = (data) => api.post('/courses', data).then(r => r.data)
export const updateCourse = (id, data) => api.put(`/courses/${id}`, data).then(r => r.data)
export const deleteCourse = (id) => api.delete(`/courses/${id}`)

// ── People ──────────────────────────────────────────────────
export const fetchPeople = (params) => api.get('/people', { params }).then(r => r.data)
export const fetchPerson = (id) => api.get(`/people/${id}`).then(r => r.data)
export const createPerson = (data) => api.post('/people', data).then(r => r.data)
export const updatePerson = (id, data) => api.put(`/people/${id}`, data).then(r => r.data)
export const deletePerson = (id) => api.delete(`/people/${id}`)
export const importCSV = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/people/csv-import', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}

// ── Training Records ────────────────────────────────────────
export const fetchRecords = (params) => api.get('/training-records', { params }).then(r => r.data)
export const createRecord = (data) => api.post('/training-records', data).then(r => r.data)
export const updateRecord = (id, data) => api.put(`/training-records/${id}`, data).then(r => r.data)
export const deleteRecord = (id) => api.delete(`/training-records/${id}`)
export const uploadCertificate = (recordId, file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`/training-records/${recordId}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}

// ── Reports ─────────────────────────────────────────────────
export const fetchComplianceReport = (deptId) => api.get('/reports/compliance', { params: deptId ? { department_id: deptId } : {} }).then(r => r.data)
export const fetchDepartmentSummary = () => api.get('/reports/departments').then(r => r.data)
export const fetchExpiringTraining = (days = 30) => api.get('/reports/expiring', { params: { days } }).then(r => r.data)
export const fetchDashboardStats = () => api.get('/reports/stats').then(r => r.data)

// ── Health ──────────────────────────────────────────────────
export const healthCheck = () => api.get('/health').then(r => r.data)

export default api
