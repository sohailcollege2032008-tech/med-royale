import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  session: null,
  profile: null,
  loading: true,
  initialized: false,
  initializing: false,
  setInitializing: () => set({ initializing: true }),
  setAuth: (session, profile) => set({ session, profile, loading: false, initialized: true, initializing: false }),
  setLoading: (loading) => set({ loading }),
  clearAuth: () => set({ session: null, profile: null, loading: false, initialized: true, initializing: false })
}))
