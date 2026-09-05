<template>
  <div v-if="userInfo" class="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
    <div class="flex items-center gap-4 bg-base-100 p-4 rounded-2xl border border-base-200/80">
      <div class="avatar">
        <div v-if="!userInfo.avatar" class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
          {{ (userInfo?.nickname || userInfo?.username || '用户').charAt(0) }}
        </div>
        <img v-else :src="userInfo.avatar" alt="avatar" class="w-16 h-16 rounded-full" />
      </div>
      <div>
        <h2 class="text-lg font-bold">{{ userInfo?.nickname || userInfo?.username || '用户' }}</h2>
        <div class="text-sm text-base-content/60">共 {{ totalCount }} 篇故事</div>
      </div>
      <div class="ml-auto">
        <button class="btn btn-sm btn-error btn-soft" @click="logout">退出登录</button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-8">
      <span class="loading loading-spinner loading-lg"></span>
    </div>

    <div v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="s in stories" :key="s.id" class="card bg-base-100 border border-base-200/80 p-3 rounded-xl">
          <div class="flex flex-col h-full">
            <div class="flex-1">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-semibold truncate cursor-pointer" @click="previewStory(s.id!)">{{ s.title || '未命名' }}</h3>
                <div v-if="isCurrentUser" class="shrink-0 ml-2">
                  <span class="badge badge-sm" :class="statusClass(s.status)">{{ statusLabel(s.status) }}</span>
                </div>
              </div>
              <p class="text-xs text-base-content/70 line-clamp-3 mt-2">{{ s.description || '暂无描述' }}</p>
            </div>
            <div class="mt-3 flex items-center justify-between text-xs text-base-content/60">
              <div class="flex items-center gap-2">
                <Icon icon="mdi:book-open-variant" class="w-4 h-4 text-primary/70" />
                <span>共 {{ s.passageSize || 0 }} 章</span>
              </div>
              <div>
                <button v-if="isCurrentUser" class="btn btn-ghost btn-xs" @click="editStory(s.id!)">编辑</button>
                <button class="btn btn-ghost btn-xs" @click="previewStory(s.id!)">阅读</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!stories.length" class="text-center text-base-content/60 py-8">该用户尚未发布任何故事。</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { listStories, type IStory } from '@/api/stories';
import { useAuthStore } from '@/stores/modules/auth';
import { Icon } from '@iconify/vue';
import request from '@/utils/http';
import { User } from '@/api/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const paramAuthorId = route.params.authorId as string;
const paramFrom = route.params.from as string | undefined;
const paramUsername = route.params.username as string | undefined;
const stories = ref<IStory[]>([]);
const totalCount = ref(0);
const loading = ref(true);
const userInfo = ref<User>();

const isCurrentUser = computed(() => auth.getUser?.id === userInfo.value?.id);

const load = async () => {
  loading.value = true;
  try {
    // If username (with optional from) provided, fetch user record first to get id
    if (paramUsername) {
      const userPath = paramFrom ? `/users/${paramFrom}/${paramUsername}` : `/users/${paramUsername}`;
      const user = await request.get<any>({ url: userPath });
      if (user) {
        userInfo.value = user;
        const res = await listStories({ authorId: userInfo.value!.id });
        stories.value = res.data || [];
        totalCount.value = res.total || stories.value.length;
      }
    }

  } finally {
    loading.value = false;
  }
};

const previewStory = (id: string) => {
  router.push({ name: 'story-play', params: { storyId: id } });
};
const editStory = (id: string) => {
  router.push({ name: 'story-edit', params: { storyId: id } });
};

onMounted(() => {
  load();
});

function statusLabel(status?: string) {
  switch (status) {
    case 'draft':
      return '草稿';
    case 'pending':
      return '待审核';
    case 'published':
      return '已发布';
    case 'rejected':
      return '已拒绝';
    default:
      return '未知';
  }
}

function statusClass(status?: string) {
  switch (status) {
    case 'draft':
      return 'badge-ghost';
    case 'pending':
      return 'badge-warning';
    case 'published':
      return 'badge-success';
    case 'rejected':
      return 'badge-error';
    default:
      return 'badge-ghost';
  }
}

function logout() {
  auth.logout();
  router.push({ name: 'home' });
}
</script>
