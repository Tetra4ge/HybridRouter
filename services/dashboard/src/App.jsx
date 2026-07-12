import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Console from './pages/Console'
import Footer from './components/Footer'
import CustomCursor from './components/CustomCursor'
import Lenis from 'lenis'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    if (window.lenis) {
      window.lenis.scrollTo(0, { immediate: true })
    }
  }, [pathname])

  return null
}

function App() {
  const [theme, setTheme] = useState('dark')
  const [isSignedIn, setIsSignedIn] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Initialize Lenis smooth scroll globally
  useEffect(() => {
    // Reset browser scroll to top on boot
    window.scrollTo(0, 0)

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    window.lenis = lenis
    lenis.scrollTo(0, { immediate: true })

    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <CustomCursor />
      <div className="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home theme={theme} toggleTheme={toggleTheme} isSignedIn={isSignedIn} setIsSignedIn={setIsSignedIn} />} />
            <Route path="/console" element={<Console theme={theme} toggleTheme={toggleTheme} isSignedIn={isSignedIn} setIsSignedIn={setIsSignedIn} />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  )
}

export default App
