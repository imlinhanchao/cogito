import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
// import { login as loginApi } from '@/api/auth'
import { getUserProfile } from '@/api/user'
import { getConfigStatus } from '@/api/config'
import { storage } from '@/utils/storage'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(storage.getItem('token'))
  const user = ref<any>(JSON.parse(storage.getItem('user') || 'null'))
  const isConfigured = ref<boolean>()

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.isAdmin || false)

  const getToken = computed(() => token.value)
  const getUser = computed(() => user.value)

  function setAuth(authData: { access_token: string; user: any }) {
    token.value = authData.access_token
    user.value = authData.user
    storage.setItem('token', authData.access_token)
    storage.setItem('user', JSON.stringify(authData.user))
  }

  function clearAuth() {
    token.value = null
    user.value = null
    storage.removeItem('token')
    storage.removeItem('user')
  }

  async function loadProfile() {
    if (!token.value) return

    try {
      const data = await getUserProfile()
      user.value = data
      setAuth({ access_token: token.value, user: user.value })
    } catch (error: any) {
      if (error.response?.data?.code === 40101) {
        clearAuth()
      }
    }
  }

  async function loginWithToken(accessToken: string) {
    token.value = accessToken
    storage.setItem('token', accessToken)
    await loadProfile()
  }

  function logout() {
    clearAuth()
  }

  async function checkConfig() {
    isConfigured.value = await getConfigStatus().then(data => data.configured);
    return isConfigured.value;
  }

  return {
    isAuthenticated,
    isAdmin,
    isConfigured,
    getToken,
    getUser,
    setAuth,
    loginWithToken,
    logout,
    loadProfile,
    checkConfig,
  }
})
