import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Console from './pages/Console'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/console" element={<Console />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
