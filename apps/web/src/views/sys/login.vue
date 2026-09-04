
<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getLoginSupport, login, loginWithAccount, registerAccount } from '@/api/auth'
import { useAuthStore } from '@/stores/modules/auth'
import HeaderLogo from '@/layouts/components/HeaderLogo.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)
const submitting = ref(false)

const emit = defineEmits<{
  (e: 'success'): void
}>()

const activeTab = ref<'login' | 'register'>('login')
const error = ref('')
const success = ref('')
const thirdParty = ref<string[]>([])
const showPassword = ref(false)

const loginForm = ref({
  username: '',
  password: '',
})

const registerForm = ref({
  username: '',
  email: '',
  password: '',
  nickname: '',
})

if (route.params.source) {
  loading.value = true
  login(route.params.source as string, route.query).then((res) => {
    if (res?.access_token) {
      authStore.setAuth(res)
    }
    emit('success')
    router.push('/')
  }).catch((err) => {
    error.value = err.response?.data?.msg || err.message || '登录失败，请检查输入'
  }).finally(() => {
    loading.value = false
  })
}

getLoginSupport().then((res) => {
  thirdParty.value = res.thirdParty || []
}).catch((err) => {
  console.error('Failed to get login support:', err)
})

async function handleLogin() {
  error.value = ''
  success.value = ''
  if (!loginForm.value.username || !loginForm.value.password) {
    error.value = '请输入用户名和密码'
    return
  }

  submitting.value = true
  try {
    const res = await loginWithAccount({
      username: loginForm.value.username,
      password: loginForm.value.password,
    })
    authStore.setAuth(res)
    emit('success')
    router.push('/')
  } catch (err: any) {
    error.value = err.response?.data?.msg || err.message || '登录失败，请检查用户名和密码'
  } finally {
    submitting.value = false
  }
}

async function handleRegister() {
  error.value = ''
  success.value = ''
  if (!registerForm.value.username || !registerForm.value.email || !registerForm.value.password) {
    error.value = '请填写完整的注册信息'
    return
  }
  if (!registerForm.value.email.includes('@')) {
    error.value = '邮箱格式不正确'
    return
  }

  submitting.value = true
  try {
    await registerAccount({
      username: registerForm.value.username,
      email: registerForm.value.email,
      password: registerForm.value.password,
      nickname: registerForm.value.nickname || undefined,
    })
    success.value = '注册成功！正在为你尝试登录...'
    
    // Auto login after register
    const loginRes = await loginWithAccount({
      username: registerForm.value.username,
      password: registerForm.value.password,
    })
    authStore.setAuth(loginRes)
    emit('success')
    setTimeout(() => {
      router.push('/')
    }, 1000)
  } catch (err: any) {
    error.value = err.response?.data?.msg || err.message || '注册失败，请重试'
  } finally {
    submitting.value = false
  }
}

function loginWithFishpi() {
  window.location.href = '/api/auth/login/fishpi'
}

function thirdPartyLogin(type: string) {
  window.location.href = `/api/auth/login/${type}`
}

function switchTab(tab: 'login' | 'register') {
  activeTab.value = tab
  error.value = ''
  success.value = ''
}
</script>

<template>
  <div class="bg-base-100 flex items-center justify-center min-h-screen p-4">
    <div class="p-8 rounded-xl space-y-6 w-full max-w-105 mx-auto flex-none">
      <!-- Header / Logo -->
      <div class="text-center space-y-3">
        <div class="flex items-center justify-center p-3 rounded-full text-xl bg-base-200 mb-1 cursor-pointer gap-2" @click="$router.replace('/')">
          <HeaderLogo />
          <span>|</span>
          <b>{{ activeTab === 'login' ? '登录' : '注册' }}</b>
        </div>
        
        <!-- Tabs for Login / Register -->
        <div role="tablist" class="tabs tabs-box grid grid-cols-2">
          <button
            role="tab"
            class="tab text-lg font-bold"
            :class="{ 'tab-active': activeTab === 'login' }"
            @click="switchTab('login')"
          >
            登录
          </button>
          <button
            role="tab"
            class="tab text-lg font-bold"
            :class="{ 'tab-active': activeTab === 'register' }"
            @click="switchTab('register')"
          >
            注册
          </button>
        </div>
      </div>

      <!-- Feedback Messages -->
      <div v-if="error" class="alert alert-error text-sm py-2 px-3">
        <Icon icon="mdi:alert-circle" class="text-lg shrink-0" />
        <span>{{ error }}</span>
      </div>
      <div v-if="success" class="alert alert-success text-sm py-2 px-3">
        <Icon icon="mdi:check-circle" class="text-lg shrink-0" />
        <span>{{ success }}</span>
      </div>

      <!-- OAuth Loading State -->
      <div v-if="loading" class="text-center py-6 space-y-3">
        <Icon icon="line-md:loading-loop" class="text-3xl text-primary mx-auto" />
        <p class="text-sm text-base-content/70">正在检查登录状态...</p>
      </div>

      <div v-else class="space-y-5">
        <!-- Account Login Form -->
        <form v-if="activeTab === 'login'" class="space-y-4" @submit.prevent="handleLogin">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">用户名</span>
            </label>
            <div class="relative">
              <input
                v-model="loginForm.username"
                type="text"
                placeholder="请输入用户名"
                class="input input-bordered w-full pl-10"
                required
              />
              <Icon icon="mdi:account" class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-lg" />
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">密码</span>
            </label>
            <div class="relative">
              <input
                v-model="loginForm.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                class="input input-bordered w-full pl-10 pr-10"
                required
              />
              <Icon icon="mdi:lock" class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-lg" />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                @click="showPassword = !showPassword"
              >
                <Icon :icon="showPassword ? 'mdi:eye-off' : 'mdi:eye'" class="text-lg" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-primary w-full text-base font-medium mt-2"
            :disabled="submitting"
          >
            <Icon v-if="submitting" icon="line-md:loading-loop" class="text-lg" />
            <span>{{ submitting ? '登录中...' : '登录' }}</span>
          </button>
        </form>

        <!-- Account Register Form -->
        <form v-else class="space-y-4" @submit.prevent="handleRegister">
          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">用户名</span>
            </label>
            <div class="relative">
              <input
                v-model="registerForm.username"
                type="text"
                placeholder="请输入用户名"
                class="input input-bordered w-full pl-10"
                required
              />
              <Icon icon="mdi:account" class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-lg" />
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">邮箱</span>
            </label>
            <div class="relative">
              <input
                v-model="registerForm.email"
                type="email"
                placeholder="请输入邮箱地址"
                class="input input-bordered w-full pl-10"
                required
              />
              <Icon icon="mdi:email" class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-lg" />
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">密码</span>
            </label>
            <div class="relative">
              <input
                v-model="registerForm.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                class="input input-bordered w-full pl-10 pr-10"
                required
              />
              <Icon icon="mdi:lock" class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-lg" />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                @click="showPassword = !showPassword"
              >
                <Icon :icon="showPassword ? 'mdi:eye-off' : 'mdi:eye'" class="text-lg" />
              </button>
            </div>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">昵称（选填）</span>
            </label>
            <div class="relative">
              <input
                v-model="registerForm.nickname"
                type="text"
                placeholder="请输入昵称"
                class="input input-bordered w-full pl-10"
              />
              <Icon icon="mdi:account-outline" class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 text-lg" />
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-primary w-full text-base font-medium mt-2"
            :disabled="submitting"
          >
            <Icon v-if="submitting" icon="line-md:loading-loop" class="text-lg" />
            <span>{{ submitting ? '注册中...' : '注册并登录' }}</span>
          </button>
        </form>

        <!-- Third Party Login Section -->
        <div>
          <div class="divider text-xs text-base-content/40">第三方登录</div>
          <div class="flex flex-wrap gap-2 w-full">
            <!-- FishPi button (Always displayed in Third Party section) -->
            <button
              type="button"
              class="btn flex-1 gap-2 bg-[#f0d35e] text-black hover:bg-[#e0c34e] border-none"
              @click="loginWithFishpi"
            >
              <img src="/fishpi.svg" class="w-5 h-5 object-contain" alt="摸鱼派" />
              <span class="text-sm font-medium">摸鱼派</span>
            </button>

            <!-- GitHub button -->
            <button
              v-if="thirdParty.includes('github')"
              type="button"
              class="btn flex-1 gap-2 bg-[#24292e] text-white hover:bg-[#2f363d] dark:bg-white dark:text-[#24292e] dark:hover:bg-gray-200 border-none"
              @click="thirdPartyLogin('github')"
            >
              <Icon icon="mdi:github" class="text-xl!" />
              <span class="text-sm font-medium">GitHub</span>
            </button>

            <!-- Steam button -->
            <button
              v-if="thirdParty.includes('steam')"
              type="button"
              class="btn flex-1 gap-2 bg-[#171a21] text-white hover:bg-[#2a475e] dark:bg-[#2a475e] dark:text-white dark:hover:bg-[#1b2838] border-none"
              @click="thirdPartyLogin('steam')"
            >
              <Icon icon="mdi:steam" class="text-xl!" />
              <span class="text-sm font-medium">Steam</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>