import { createContext, useContext, type ReactNode } from 'react'
import type { AuthUser } from './api'

interface AuthState {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({
  user,
  setUser,
  children,
}: {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  children: ReactNode
}) {
  return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return value
}
