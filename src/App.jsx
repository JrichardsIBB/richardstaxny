import { BrowserRouter, Routes, Route } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import ServicesPage from './pages/ServicesPage'
import AboutPage from './pages/AboutPage'
import ResourcesPage from './pages/ResourcesPage'
import ContactUploadPage from './pages/ContactUploadPage'
import HelpCenterPage from './pages/HelpCenterPage'
import AuthPage from './pages/AuthPage'
import NotFoundPage from './pages/NotFoundPage'
import TaxBot from './components/TaxBot'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="help" element={<HelpCenterPage />} />
            <Route path="contact" element={<ContactUploadPage />} />
            <Route path="login" element={<AuthPage />} />
            <Route path="signup" element={<AuthPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
        <TaxBot />
      </BrowserRouter>
    </AuthProvider>
  )
}
