import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppStateProvider } from './hooks/useAppState'
import Layout from './components/Layout'
import Home from './pages/Home'
import Train from './pages/Train'
import Lesson from './pages/Lesson'
import Practice from './pages/Practice'
import Arena from './pages/Arena'
import ProgressPage from './pages/Progress'
import Parent from './pages/Parent'
import './styles/global.css'

export default function App() {
  return (
    <AppStateProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="train" element={<Train />} />
            <Route path="lesson/:topicId" element={<Lesson />} />
            <Route path="practice/:topicId" element={<Practice />} />
            <Route path="arena" element={<Arena />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="parent" element={<Parent />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppStateProvider>
  )
}
