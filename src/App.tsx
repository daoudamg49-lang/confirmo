import { HashRouter, Route, Routes } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { History } from './pages/History'
import { Home } from './pages/Home'
import { Reports } from './pages/Reports'
import { Send } from './pages/Send'
import { Settings } from './pages/Settings'
import { WalletProvider } from './state/WalletContext'

export default function App() {
  return (
    <WalletProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/send" element={<Send />} />
          <Route path="/history" element={<History />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        <BottomNav />
      </HashRouter>
    </WalletProvider>
  )
}
