import { Navigate, BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthProvider } from './lib/AuthContext'
import { ProfileProvider } from './lib/ProfileContext'
import { ThemeProvider } from './lib/ThemeContext'
import { About } from './pages/About'
import { Account } from './pages/Account'
import { Collection } from './pages/Collection'
import { Home } from './pages/Home'
import { PasteTool } from './pages/PasteTool'
import { Postal } from './pages/Postal'
import { Privacy } from './pages/Privacy'
import { Settings } from './pages/Settings'
import { ShareMatch } from './pages/ShareMatch'
import { Terms } from './pages/Terms'
import { VerifyEmail } from './pages/VerifyEmail'
import './index.css'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <ProfileProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Collection />} />
                <Route path="collection" element={<Navigate to="/" replace />} />
                <Route path="paste" element={<PasteTool />} />
                <Route path="postal" element={<Postal />} />
                <Route path="s/:token" element={<ShareMatch />} />
                <Route path="account" element={<Account />} />
                <Route path="verify" element={<VerifyEmail />} />
                <Route path="settings" element={<Settings />} />
                <Route path="welcome" element={<Home />} />
                <Route path="about" element={<About />} />
                <Route path="privacy" element={<Privacy />} />
                <Route path="terms" element={<Terms />} />
              </Route>
            </Routes>
          </ProfileProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
