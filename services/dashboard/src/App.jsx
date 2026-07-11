import { useState } from 'react'
import './App.css'
import Home from './pages/Home'
import Console from './pages/Console'

function App() {
  const [currentPage, setCurrentPage] = useState('home') // 'home' or 'console'

  if (currentPage === 'home') {
    return <Home onLaunchConsole={() => setCurrentPage('console')} />
  }

  return <Console onBackToHome={() => setCurrentPage('home')} />
}

export default App
