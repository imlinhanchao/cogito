<template>
  <div class="p-4 sm:p-6 space-y-6">
    <!-- 头部搜索与操作栏 -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-base-100 p-4 rounded-2xl border border-base-200/80 shadow-2xs">
      <div class="flex flex-wrap items-center gap-3">
        <section class="flex items-center gap-2 whitespace-nowrap">
          <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon icon="mdi:book-open-page-variant" class="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-base-content tracking-tight">{{ $route.meta.title }}</h2>
          </div>
        </section>
        
        <div class="join w-full sm:w-auto">
          <label class="input input-bordered input-sm join-item flex items-center gap-2 flex-1 sm:w-64">
            <Icon icon="mdi:magnify" class="w-4 h-4 text-base-content/50" />
            <input 
              v-model="query.search" 
              type="search" 
              placeholder="搜索标题、描述或标签..." 
              @keyup.enter="doSearch"
            />
          </label>
          <button class="btn btn-sm btn-primary join-item" :disabled="loading" @click="doSearch">
            <span v-if="loading" class="loading loading-spinner loading-xs"></span>
            <Icon v-else icon="mdi:magnify" class="w-4 h-4" />
            <span>搜索</span>
          </button>
        </div>
      </div>
      
      <div class="flex items-center justify-between sm:justify-end gap-3 text-sm text-base-content/60 border-t sm:border-t-0 pt-2 sm:pt-0 border-base-200">
        <div class="flex items-center gap-1.5">
          <Icon icon="mdi:format-list-numbered" class="w-4 h-4 text-primary" />
          <span>共 <strong class="text-base-content font-semibold">{{ totalCount }}</strong> 个故事</span>
        </div>
      </div>
    </div>

    <!-- 初次/搜索加载状态列表 -->
    <div v-if="loading && stories.length === 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="n in 8" :key="n" class="card bg-base-100 border border-base-200/80 p-4 space-y-3">
        <div class="flex items-center gap-3">
          <div class="skeleton w-10 h-10 rounded-full shrink-0"></div>
          <div class="space-y-1.5 flex-1">
            <div class="skeleton h-4 w-3/4"></div>
            <div class="skeleton h-3 w-1/2"></div>
          </div>
        </div>
        <div class="skeleton h-8 w-full"></div>
        <div class="flex gap-2">
          <div class="skeleton h-5 w-12 rounded-full"></div>
          <div class="skeleton h-5 w-16 rounded-full"></div>
        </div>
      </div>
    </div>

    <!-- 故事卡片网格 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" v-else-if="stories.length">
      <div v-for="s in stories" :key="s.id" class="card card-compact bg-base-100 border border-base-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden flex flex-col justify-between">
        <div class="card-body p-4 space-y-3">
          <div class="flex items-start gap-3">
            <div class="avatar shrink-0">
              <div v-if="!s.author?.avatar" class="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold border border-primary/20">
                {{ initials(s) }}
              </div>
              <img v-else :src="s.author?.avatar" alt="avatar" class="w-10 h-10 rounded-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <h3 class="font-bold text-base text-base-content truncate hover:text-primary transition-colors cursor-pointer" @click="previewStory(s.id!)">
                  {{ s.title || '未命名' }}
                </h3>
                <div v-if="isCurrentUser" class="shrink-0 ml-2">
                  <span class="badge badge-sm" :class="statusClass(s.status)">{{ statusLabel(s.status) }}</span>
                </div>
              </div>
              <div class="flex items-center gap-1 text-xs text-base-content/60 truncate mt-0.5">
                <Icon icon="mdi:account-outline" class="w-3.5 h-3.5 shrink-0" />
                <RouterLink :to="userLink(s)" class="truncate hover:text-primary">
                  {{ s.author?.nickname || s.author?.username || '未知作者' }}
                </RouterLink>
              </div>
            </div>
          </div>

          <p class="text-xs text-base-content/70 line-clamp-2 leading-relaxed min-h-8">
            {{ s.description || '暂无故事描述' }}
          </p>

          <div v-if="s.status === 'rejected'" class="mt-2 text-xs text-error flex items-center gap-2">
            <Icon icon="mdi:alert-circle-outline" class="w-4 h-4" />
            <span class="font-medium">已拒绝</span>
            <span class="text-base-content/60">{{ s.reviewReason || '未提供理由' }}</span>
          </div>

          <div class="flex flex-wrap gap-1.5 pt-1">
            <span v-if="tagsArray(s).length === 0" class="badge badge-xs badge-ghost text-base-content/40">无标签</span>
            <button 
              v-for="t in tagsArray(s)" 
              :key="t" 
              type="button" 
              class="badge badge-xs badge-secondary badge-soft hover:badge-secondary transition-colors cursor-pointer gap-1"
              @click="onTagClick(t)"
            >
              <Icon icon="mdi:tag-outline" class="w-3 h-3" />
              <span>{{ t }}</span>
            </button>
          </div>
        </div>

        <!-- 卡片底部操作栏 -->
        <div class="border-t border-base-200/60 px-4 py-2.5 bg-base-200/30 flex items-center justify-between gap-2 text-xs">
          <div class="text-base-content/60 flex items-center gap-1">
            <Icon icon="mdi:book-open-variant" class="w-4 h-4 text-primary/80" />
            <span>共 {{ s.passageSize || 0 }} 章</span>
          </div>

          <div class="flex items-center gap-1">
            <button 
              v-if="s.authorId == getUser?.id && isCurrentUser" 
              class="btn btn-ghost btn-xs btn-square hover:bg-base-300/50" 
              @click="editStory(s.id!)" 
              title="编辑故事"
            >
              <Icon icon="mdi:pencil-outline" class="w-4 h-4 text-base-content/70" />
            </button>
            <button 
              class="btn btn-primary btn-xs gap-1" 
              @click="previewStory(s.id!)" 
              title="阅读故事"
            >
              <Icon icon="mdi:play" class="w-3.5 h-3.5" />
              <span>阅读</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="card bg-base-100 border border-base-200/80 p-12 text-center space-y-3 my-8">
      <div class="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center mx-auto text-base-content/40">
        <Icon icon="mdi:book-search-outline" class="w-8 h-8" />
      </div>
      <div class="space-y-1">
        <h4 class="font-semibold text-base text-base-content">未找到相关故事</h4>
        <p class="text-xs text-base-content/60">尝试更改搜索关键词或清空搜索条件</p>
      </div>
      <div v-if="query.search" class="pt-2">
        <button class="btn btn-sm btn-ghost gap-1" @click="clearSearch">
          <Icon icon="mdi:refresh" class="w-4 h-4" />
          <span>重置搜索</span>
        </button>
      </div>
    </div>

    <!-- 加载更多 -->
    <div class="mt-8 flex justify-center pb-4">
      <button 
        v-if="hasMore" 
        class="btn btn-sm btn-outline gap-2 min-w-32" 
        :disabled="loadingMore" 
        @click="loadMore"
      >
        <span v-if="loadingMore" class="loading loading-spinner loading-xs"></span>
        <Icon v-else icon="mdi:chevron-down" class="w-4 h-4" />
        <span>{{ loadingMore ? '加载中...' : '加载更多' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import type { IStory } from '@/api/stories';
import { useAuthStore } from '@/stores/modules/auth';
import { listStories } from '@/api/stories';
import { ref, onMounted, watch, reactive, computed } from 'vue';
import { useRoute } from 'vue-router';
import { Icon } from '@iconify/vue';

const router = useRouter();
const route = useRoute();
const { getUser } = useAuthStore();
const stories = ref<Array<IStory>>([]);
const totalCount = ref<number>(0);
const loading = ref<boolean>(false);
const loadingMore = ref<boolean>(false);

const hasMore = computed(() => {
  return totalCount.value > stories.value.length;
});

const isCurrentUser = computed(() => {
  return route.name == 'my-story-list';
});

const query = reactive({ 
  search: '',
  authorId: isCurrentUser.value ? getUser?.id : '',
  createdAt: Date.now(),
  limit: 20
});

const load = async (isMore = false) => {
  if (isMore) {
    loadingMore.value = true;
  } else {
    loading.value = true;
  }
  try {
    const res = await listStories(query);
    const data = res.data ?? [];
    const total = res.total ?? 0;
    totalCount.value = total;
    if (isMore) {
      stories.value.push(...(data || []));
    } else {
      stories.value = data || [];
    }
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return;
  query.createdAt = stories.value[stories.value.length - 1]?.createdAt ?? Date.now();
  await load(true);
};

const createNew = () => {
  router.push({ name: 'story-editor' });
};

const editStory = (id: string) => {
  router.push({ name: 'story-editor', params: { storyId: id } });
};

const previewStory = (id: string) => {
  router.push({ name: 'story-play', params: { storyId: id } });
};

const userLink = (s: IStory) => {
  const from = s.author?.from;
  const username = s.author?.username;
  if (from && username) return { path: `/${from}/${username}` };
  else return { path: `/${username}` };
};

onMounted(async () => {
  const q = route.query.search;
  query.search = q?.toString() || '';
  await load();
  
  watch(
    () => route.query.search,
    (val) => {
      const v = val?.toString() || '';
      if (v !== query.search) {
        query.createdAt = Date.now();
        query.search = v;
      }
    },
  );

  watch(() => query.search, (val) => {
    doSearch();
  });
});

function initials(story: IStory) {
  const name = story.author?.nickname || story.author?.username || '';
  if (!name) return 'U';
  return name.trim().slice(0, 1).toUpperCase();
}

function tagsArray(story: IStory): string[] {
  if (!story.tags) return [];
  if (Array.isArray(story.tags)) return story.tags;
  return String(story.tags)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

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

function doSearch() {
  const q: any = { ...route.query };
  if (query.search) q.search = query.search;
  else delete q.search;
  query.createdAt = Date.now();
  router.push({ path: route.path, query: q });
}

function clearSearch() {
  query.search = '';
  doSearch();
}

function onTagClick(tag: string) {
  query.search = tag;
  doSearch();
}

watch(
  () => route.name,
  (val) => {
    if (isCurrentUser.value) {
      query.authorId = getUser?.id || '';
    } else {
      query.authorId = '';
    }
    query.createdAt = Date.now();
    load();
  }
);
</script>
