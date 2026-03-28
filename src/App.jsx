import { BrowserRouter, Routes, Route } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import { AdminProvider } from './context/AdminContext'
import Layout from './components/layout/Layout'
import AdminLayout from './components/admin/AdminLayout'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import HomePage from './pages/HomePage'
import ServicesPage from './pages/ServicesPage'
import AboutPage from './pages/AboutPage'
import ResourcesPage from './pages/ResourcesPage'
import ContactUploadPage from './pages/ContactUploadPage'
import HelpCenterPage from './pages/HelpCenterPage'
import AuthPage from './pages/AuthPage'
import NotFoundPage from './pages/NotFoundPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import MessagesPage from './pages/MessagesPage'
import ProtectedRoute from './components/ProtectedRoute'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminDocuments from './pages/admin/AdminDocuments'
import AdminClients from './pages/admin/AdminClients'
import AdminProcessing from './pages/admin/AdminProcessing'
import AdminExports from './pages/admin/AdminExports'
import AdminUsers from './pages/admin/AdminUsers'
import AdminClientImports from './pages/admin/AdminClientImports'
import AdminEarnings from './pages/admin/AdminEarnings'
import TaxBot from './components/TaxBot'

export default function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="services" element={<ServicesPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route path="help" element={<HelpCenterPage />} />
              <Route path="contact" element={<ContactUploadPage />} />
              <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
              <Route path="login" element={<AuthPage />} />
              <Route path="signup" element={<AuthPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Admin routes */}
            <Route
              path="admin"
              element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="documents" element={<AdminDocuments />} />
              <Route path="clients" element={<AdminClients />} />
              <Route path="processing" element={<AdminProcessing />} />
              <Route path="exports" element={<AdminExports />} />
              <Route path="invites" element={<AdminClientImports />} />
              <Route path="earnings" element={<AdminEarnings />} />
              <Route
                path="users"
                element={
                  <ProtectedAdminRoute requiredRoles={['owner']}>
                    <AdminUsers />
                  </ProtectedAdminRoute>
                }
              />
            </Route>
          </Routes>
          <TaxBot />
        </BrowserRouter>
      </AdminProvider>
    </AuthProvider>
  )
}
