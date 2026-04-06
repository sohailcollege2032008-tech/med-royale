import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  session: null,
  profile: null,
  loading: true,
  setAuth: (session, profile) => set({ session, profile, loading: false }),
  setLoading: (loading) => set({ loading }),
  clearAuth: () => set({ session: null, profile: null, loading: false })
}))
