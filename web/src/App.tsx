import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { About } from './pages/About'
import { Collection } from './pages/Collection'
import { Home } from './pages/Home'
import { PasteTool } from './pages/PasteTool'
import { Privacy } from './pages/Privacy'
import { Terms } from './pages/Terms'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="paste" element={<PasteTool />} />
          <Route path="collection" element={<Collection />} />
          <Route path="about" element={<About />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
