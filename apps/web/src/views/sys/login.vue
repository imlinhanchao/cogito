
<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getLoginSupport, login } from '@/api/auth'
import Icon from '@/components/Icon'

const router = useRouter()
const route = useRoute();
const loading = ref(false);

const emit = defineEmits<{
  (e: 'success'): void
}>()

const name = ref('')
const error = ref('')
const thirdParty = ref<string[]>([])

if (route.params.source) {
  loading.value = true;
  login(route.params.source as string, route.query).then(() => {
    emit('success');
    router.push('/');
  }).catch((err) => {
    error.value = err.response?.data?.msg || err.message || '登录失败，请检查输入'
  }).finally(() => {
    loading.value = false;
  });
}

getLoginSupport().then((res) => {
  thirdParty.value = res.thirdParty;
}).catch((err) => {
  console.error('Failed to get login support:', err);
});

function loginWithFishpi() {
  window.location.href = '/api/auth/login/fishpi'
}

function thirdPartyLogin(type: string) {
  window.location.href = `/api/auth/login/${type}`
}

</script>
<template>
  <div class="bg-base-100 flex items-center justify-center min-h-screen">
    <div class="p-8 rounded-xl bg-base-200 border border-base-content/20 shadow-2xl space-y-6 w-full max-w-[400px] mx-auto flex-none">
      <div class="text-center space-y-4">
        <div class="inline-block p-4 rounded-full bg-base-200/50 mb-2">
          <img src="@/assets/images/logo.png" alt="Logo" class="w-24 h-24 object-contain" />
        </div>
        <h1 class="text-4xl font-bold tracking-widest text-base-content">登录</h1>
      </div>
      <p v-if="error" class="text-error text-sm bg-error/10 py-2 px-3 rounded border border-error/20 text-center">
        {{ error }}
      </p>
      
      <p v-if="loading" class="status-msg text-center">
        <Icon icon="line-md:loading-loop" />
        正在检查登录状态...
      </p>
      <div v-else class="flex flex-col gap-4">
        <button
          class="btn btn-lg bg-[#f0d35e] flex items-center justify-center gap-3 w-full py-3 transition-all group"
          @click="loginWithFishpi"
        >
          <img src="/fishpi.svg" class="w-[1.5em] group-hover:scale-110 transition-transform" />
          <span class="tracking-wide text-black">登 录</span>
        </button>
  
        <!-- Third Party Login -->
        <div v-if="thirdParty.length > 0" class="divider text-xs text-base-content/30">第三方登录</div>
        <div v-if="thirdParty.length > 0" class="flex gap-2 w-full">
          <button
            v-if="thirdParty.includes('github')"
            class="btn flex-1 gap-2 group btn-lg bg-[#24292e] text-white hover:bg-[#2f363d] dark:bg-white dark:text-[#24292e] dark:hover:bg-gray-200"
            @click="thirdPartyLogin('github')"
          >
            <Icon icon="mdi:github" class="text-xl group-hover:scale-110 transition-transform" />
            <span class="tracking-wide text-sm">GitHub</span>
          </button>
  
          <button
            v-if="thirdParty.includes('steam')"
            class="btn flex-1 gap-2 group btn-lg bg-[#171a21] text-white hover:bg-[#2a475e] dark:bg-[#2a475e] dark:text-white dark:hover:bg-[#1b2838]"
            @click="thirdPartyLogin('steam')"
          >
            <Icon icon="mdi:steam" class="text-xl group-hover:scale-110 transition-transform" />
            <span class="tracking-wide text-sm">Steam</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>