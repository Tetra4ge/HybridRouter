/**
 * context/AuthContext.jsx
 * React Context providing Firebase Auth state to the entire app.
 * Exposes: currentUser, loading, signInWithGoogle, signOutUser
 */
import { createContext, useContext, useState, useEffect } from 'react'
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth, googleProvider } from '../firebase/config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signInWithGoogle() {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      console.error('[Auth] Google sign-in failed:', err.message)
    }
  }

  async function signOutUser() {
    try {
      await signOut(auth)
    } catch (err) {
      console.error('[Auth] Sign-out failed:', err.message)
    }
  }

  const value = { currentUser, loading, signInWithGoogle, signOutUser }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/** Convenience hook  use inside any component */
export function useAuth() {
  return useContext(AuthContext)
}
