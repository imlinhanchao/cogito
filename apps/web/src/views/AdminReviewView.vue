<template>
  <div class="p-4 sm:p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">待审核的故事</h2>
    </div>

    <div v-if="loading && items.length === 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

    <div v-else-if="items.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div v-for="s in items" :key="s.id" class="card card-compact bg-base-100 border border-base-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 rounded-2xl overflow-hidden flex flex-col justify-between">
        <div class="card-body p-4 space-y-3">
          <div class="flex items-start gap-3">
            <div class="avatar shrink-0">
              <div v-if="!s.author?.avatar" class="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold border border-primary/20">
                {{ initials(s) }}
              </div>
              <img v-else :src="s.author?.avatar" alt="avatar" class="w-10 h-10 rounded-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="font-bold text-base text-base-content truncate hover:text-primary transition-colors cursor-pointer" @click="view(s.id || '')">{{ s.title || '未命名' }}</h3>
              <div class="flex items-center gap-1 text-xs text-base-content/60 truncate mt-0.5">
                <Icon icon="mdi:account-outline" class="w-3.5 h-3.5 shrink-0" />
                <RouterLink :to="userLink(s)" class="truncate hover:text-primary">
                  {{ s.author?.nickname || s.author?.username || s.authorId }}
                </RouterLink>
              </div>
            </div>
          </div>

          <p class="text-xs text-base-content/70 line-clamp-2 leading-relaxed min-h-8">{{ s.description || '暂无故事描述' }}</p>
        </div>

        <div class="border-t border-base-200/60 px-4 py-2.5 bg-base-200/30 flex items-center justify-between gap-2 text-xs">
          <div class="text-base-content/60 flex items-center gap-1">
            <Icon icon="mdi:book-open-variant" class="w-4 h-4 text-primary/80" />
            <span>{{ s.passageSize || 0 }} 章</span>
          </div>

            <div class="flex items-center gap-1">
            <button class="btn btn-sm btn-primary" @click="approve(s.id || '')">通过</button>
            <button class="btn btn-ghost btn-sm" @click="view(s.id || '')">查看</button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-base-content/60">暂无待审核的故事</div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { adminPending, approveStory } from '@/api/stories';
import type { IStory } from '@/api/stories';
import { Icon } from '@iconify/vue';
import msg from '@/components/msg';

const items = ref<IStory[]>([]);
const loading = ref(true);
const router = useRouter();

const load = async () => {
  loading.value = true;
  try {
    const res = await adminPending();
    items.value = res?.data || [];
  } catch (e) {
    msg.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const approve = async (id: string) => {
  try {
    await approveStory(id);
    msg.success('已通过并上架');
    items.value = items.value.filter((s) => s.id !== id);
  } catch (e) {
    msg.error('操作失败');
  }
};

const view = (id: string) => {
  router.push({ name: 'admin-review-detail', params: { id } });
};

const initials = (s: IStory) => {
  const name = s.author?.nickname || s.author?.username || '';
  if (!name) return 'U';
  return name.trim().slice(0, 1).toUpperCase();
};

const userLink = (s: IStory) => {
  const from = s.author?.from;
  const username = s.author?.username;
  if (from && username) return { path: `/${from}/${username}` };
  if (username) return { path: `/${username}` };
  return { path: `/users/${s.authorId}` };
};

onMounted(() => {
  load();
});
</script>
 
<style scoped></style>
