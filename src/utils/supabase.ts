// Mocked Supabase client
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (callback: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => ({ error: null }),
    signInWithOtp: async () => ({ error: null }),
    verifyOtp: async () => ({ data: { session: { user: { id: 'mock-user' } } }, error: null })
  },
  from: (table: string) => ({
    select: (cols: string) => ({
      eq: (col: string, val: any) => ({
        maybeSingle: async () => ({ data: null, error: null })
      })
    }),
    upsert: async (data: any, options?: any) => ({ error: null })
  })
};

