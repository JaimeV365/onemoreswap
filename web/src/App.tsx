import { Navigate, BrowserRouter, Route, Routes, useSearchParams } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthProvider } from './lib/AuthContext'
import { ProfileProvider } from './lib/ProfileContext'
import { ThemeProvider } from './lib/ThemeContext'
import { About } from './pages/About'
import { Account } from './pages/Account'
import { Collection } from './pages/Collection'
import { Contacts } from './pages/Contacts'
import { ForgotPassword } from './pages/ForgotPassword'
import { Home } from './pages/Home'
import { Postal } from './pages/Postal'
import { Privacy } from './pages/Privacy'
import { ResetPassword } from './pages/ResetPassword'
import { Settings } from './pages/Settings'
import { ShareMatch } from './pages/ShareMatch'
import { Terms } from './pages/Terms'
import { VerifyEmail } from './pages/VerifyEmail'
import './index.css'

/** Old /swap URLs → Collection Swap tab */
function LegacySwapRedirect() {
  const [params] = useSearchParams()
  const tab = params.get('tab')
  const swap =
    tab === 'find' || tab === 'strangers'
      ? 'find'
      : tab === 'paste'
        ? 'paste'
        : tab === 'list' || tab === 'share'
          ? 'share'
          : 'share'
  const to = `/?tab=swap&swap=${swap}`
  return <Navigate to={to} replace />
}

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
                <Route path="swap" element={<LegacySwapRedirect />} />
                <Route path="match" element={<Navigate to="/?tab=swap&swap=paste" replace />} />
                <Route path="paste" element={<Navigate to="/?tab=swap&swap=paste" replace />} />
                <Route path="matching" element={<Navigate to="/?tab=swap&swap=find" replace />} />
                <Route path="postal" element={<Postal />} />
                <Route path="contacts" element={<Contacts />} />
                <Route path="s/:token" element={<ShareMatch />} />
                <Route path="account" element={<Account />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password" element={<ResetPassword />} />
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
