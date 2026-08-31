<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-base-100">
    <div class="premium-card w-full max-w-3xl p-8">
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-6">
          <img src="https://room.adventext.fun/fishpi.svg" alt="FishPi" class="h-10 w-10" />
        </div>
        <h1 class="text-3xl font-black tracking-tight text-base-content uppercase">系统配置</h1>
        <p class="text-base-content/40 font-bold mt-2">首次运行请配置数据库与服务器信息</p>
      </div>

      <form @submit.prevent="submitConfig" class="space-y-8">
        <!-- 数据库配置 -->
        <div class="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="divider col-span-2 text-xs font-bold opacity-50 uppercase tracking-wider">数据库配置</div>

          <div class="form-control w-full">
            <label class="label px-1">
              <span class="text-xs font-bold opacity-60 uppercase">数据库主机</span>
            </label>
            <input
              v-model="config.db.host"
              type="text"
              placeholder="localhost"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div class="form-control w-full">
            <label class="label px-1">
              <span class="text-xs font-bold opacity-60 uppercase">数据库端口</span>
            </label>
            <input
              v-model.number="config.db.port"
              type="number"
              placeholder="3306"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div class="form-control w-full">
            <label class="label px-1">
              <span class="text-xs font-bold opacity-60 uppercase">用户名</span>
            </label>
            <input
              v-model="config.db.username"
              type="text"
              placeholder="root"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div class="form-control w-full">
            <label class="label px-1">
              <span class="text-xs font-bold opacity-60 uppercase">密码</span>
            </label>
            <input
              v-model="config.db.password"
              type="password"
              placeholder="数据库密码"
              class="input input-bordered w-full"
            />
          </div>

          <div class="form-control w-full">
            <label class="label px-1">
              <span class="text-xs font-bold opacity-60 uppercase">数据库名</span>
            </label>
            <input
              v-model="config.db.database"
              type="text"
              placeholder="fishpi"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div class="form-control w-full">
            <label class="label px-1">
              <span class="text-xs font-bold opacity-60 uppercase">表名前缀</span>
            </label>
            <input
              v-model="config.db.entityPrefix"
              type="text"
              class="input input-bordered w-full"
              required
            />
          </div>
        </div>

        <!-- 服务器配置 -->
        <div class="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="divider col-span-2 text-xs font-bold opacity-50 uppercase tracking-wider">服务器配置</div>

          <div class="form-control w-full">
            <label class="label px-1">
              <span class="text-xs font-bold opacity-60 uppercase">服务器端口</span>
            </label>
            <input
              v-model.number="config.port"
              type="number"
              placeholder="7900"
              class="input input-bordered w-full"
              required
            />
          </div>

          <div class="form-control w-full">
            <label class="label px-1">
              <span class="text-xs font-bold opacity-60 uppercase">JWT Secret</span>
            </label>
            <label class="input">
              <input
                v-model="config.jwtSecret"
                class="grow"
                required
              />
              <Icon icon="fluent-emoji-high-contrast:game-die" class="text-base opacity-40 cursor-pointer" @click="generateKey" />
            </label>
          </div>


          <div class="col-span-full text-lg font-semibold border-b border-base-300 pb-2 mt-4">第三方登录设置（可选）</div>
          <div class="form-control w-full">
              <label class="label" for="githubClientId">
                <span class="label-text">GitHub Client ID</span>
              </label>
              <input type="text" id="githubClientId" v-model="config.github.clientId" class="input input-bordered w-full">
          </div>
          <div class="form-control w-full">
              <label class="label" for="githubClientSecret">
                <span class="label-text">GitHub Client Secret</span>
              </label>
              <input type="text" id="githubClientSecret" v-model="config.github.clientSecret" class="input input-bordered w-full">
          </div>
          <div class="form-control w-full">
              <label class="label" for="steamApiKey">
                <span class="label-text">Steam API Key</span>
              </label>
              <input type="text" id="steamApiKey" v-model="config.steam.apiKey" class="input input-bordered w-full">
          </div>
          <div class="form-control w-full">
              <label class="label" for="steamMirror">
                <span class="label-text">Steam API 镜像</span>
              </label>
              <input type="text" id="steamMirror" v-model="config.steam.mirror" class="input input-bordered w-full">
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-if="error" class="alert alert-error rounded-xl shadow-lg">
          <Icon icon="mdi:alert-circle-outline" class="h-6 w-6" />
          <span class="font-bold">{{ error }}</span>
        </div>

        <!-- 提交按钮 -->
        <div class="pt-4">
          <button
            type="submit"
            :disabled="loading"
            class="btn btn-primary w-full btn-lg font-bold shadow-lg shadow-primary/20"
          >
            <span v-if="loading" class="loading loading-spinner"></span>
            {{ loading ? '正在配置系统...' : '保存并初始化' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { setupConfig, type ConfigData } from '@/api/config'
import { useAuthStore } from '@/stores/modules/auth'

const router = useRouter()

const config = ref<ConfigData>({
  db: {
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '',
    database: 'app',
    entityPrefix: 'app_'
  },
  port: 3000,
  jwtSecret: 'app-secret-key-change-in-production',
  github: {
    clientId: '',
    clientSecret: ''
  },
  steam: {
    apiKey: '',
    mirror: ''
  }
})

const loading = ref(false)
const error = ref('')

const submitConfig = async () => {
  loading.value = true
  error.value = ''

  try {
    await setupConfig(config.value)
    // 配置成功，跳转到首页
    setTimeout(() => {
      router.push('/');
      loading.value = false
    }, 5000)
  } catch (err: any) {
    error.value = err.response?.data?.msg || err.message || '配置失败，请检查输入'
  }
}

useAuthStore().checkConfig().then((isConfigured) => {
  if (isConfigured) {
    // 如果已配置，直接跳转到首页
    window.location.href = '/'
  }
})

function generateKey() {
  const randomKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  config.value.jwtSecret = randomKey;
}
</script>