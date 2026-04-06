import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const { session, profile, setAuth, setLoading, clearAuth } = useAuthStore()

  useEffect(() => {
    let mounted = true;

    async function getProfile(userId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error fetching profile:', error)
        return null;
      }
      return data;
    }

    async function initAuth() {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session && mounted) {
        const profile = await getProfile(session.user.id)
        setAuth(session, profile)
      } else if (mounted) {
        clearAuth()
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session) {
        const profile = await getProfile(session.user.id)
        setAuth(session, profile)
      } else {
        clearAuth()
      }
    })

    return () => {
      mounted = false;
      subscription.unsubscribe()
    }
  }, [setAuth, setLoading, clearAuth])

  return { session, profile, loading: useAuthStore((state) => state.loading) }
}
