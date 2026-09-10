<template>
  <div v-if="userInfo" class="p-4 sm:p-8 max-w-5xl w-full mx-auto space-y-8">
    <div
      class="flex flex-col sm:flex-row items-center gap-6 bg-base-100 p-6 sm:p-8 rounded-3xl border border-base-200 shadow-sm"
    >
      <div class="avatar">
        <div
          v-if="!userInfo.avatar"
          class="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary"
        >
          {{ (userInfo?.nickname || userInfo?.username || "用户").charAt(0) }}
        </div>
        <img
          v-else
          :src="userInfo.avatar"
          alt="avatar"
          class="w-24 h-24 rounded-full object-cover"
        />
      </div>
      <div class="text-center sm:text-left flex-1">
        <h2 class="text-2xl font-extrabold tracking-tight">
          {{ userInfo?.nickname || userInfo?.username || "用户" }}
        </h2>
        <div class="text-base text-base-content/60 mt-1">
          {{ totalCount }} 篇创作 · {{ progress.length }} 篇阅读
        </div>
      </div>
      <div class="sm:ml-auto">
        <button class="btn btn-outline btn-sm rounded-full px-6" @click="logout">
          退出登录
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>

    <div v-else>
      <div class="flex justify-center mb-8">
        <div class="tabs tabs-boxed bg-base-200/50 p-1 rounded-full">
          <a
            class="tab tab-lg rounded-full px-8 transition-all duration-300"
            :class="{ 'tab-active bg-base-100 shadow-sm': activeTab === 'stories' }"
            @click="activeTab = 'stories'"
          >
            发布的故事
          </a>
          <a
            class="tab tab-lg rounded-full px-8 transition-all duration-300"
            :class="{ 'tab-active bg-base-100 shadow-sm': activeTab === 'progress' }"
            @click="activeTab = 'progress'"
          >
            阅读记录
          </a>
        </div>
      </div>

      <div v-if="activeTab === 'progress'" class="animate-in fade-in duration-500">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="p in progress"
            :key="p.id"
            class="group bg-base-100 border border-base-200 p-6 rounded-2xl hover:border-primary/30 transition-all shadow-sm hover:shadow-md"
          >
            <div class="flex justify-between items-start">
              <h4 class="font-bold text-lg truncate">{{ p.title }}</h4>
              <span class="badge badge-sm" :class="p.isPlaying ? 'badge-primary' : 'badge-ghost'">
                {{ p.isPlaying ? "正在阅读" : "已读" }}
              </span>
            </div>
            <p class="text-sm text-base-content/60 line-clamp-3 mt-3">
              {{ p.description || "暂无描述" }}
            </p>
            <div class="flex flex-wrap gap-2 mt-4">
              <span
                v-for="pt in p.points"
                :key="pt.name"
                class="badge badge-primary/10 text-primary border-none badge-sm tooltip"
                :data-tip="pt.description"
              >
                <Icon icon="mdi:star" class="mr-1" />
                {{ pt.name }}
              </span>
              <span
                v-for="end in p.end"
                :key="end.name"
                class="badge badge-accent/10 text-accent border-none badge-sm tooltip"
                :data-tip="end.description"
              >
                <Icon icon="boxicons:flag-chequered" class="mr-1" />
                {{ end.name }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="!progress.length" class="text-center text-base-content/50 py-16">
          暂无阅读记录
        </div>
      </div>

      <div v-if="activeTab === 'stories'" class="animate-in fade-in duration-500">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="s in stories"
            :key="s.id"
            class="card bg-base-100 border border-base-200 p-5 rounded-2xl hover:shadow-lg transition-all"
          >
            <div class="flex flex-col h-full">
              <div class="flex-1">
                <div class="flex items-start justify-between gap-2">
                  <h3
                    class="font-bold text-lg truncate cursor-pointer hover:text-primary transition-colors"
                    @click="previewStory(s.id!, s.status)"
                  >
                    {{ s.title || "未命名" }}
                  </h3>
                  <div v-if="isCurrentUser" class="shrink-0">
                    <span class="badge badge-sm" :class="statusClass(s.status)">{{
                      statusLabel(s.status)
                    }}</span>
                  </div>
                </div>
                <p class="text-sm text-base-content/60 line-clamp-3 mt-3">
                  {{ s.description || "暂无描述" }}
                </p>
              </div>
              <div
                class="mt-6 flex items-center justify-between text-sm text-base-content/50"
              >
                <div class="flex items-center gap-2">
                  <Icon icon="mdi:book-open-variant" class="w-4 h-4" />
                  <span>{{ s.passageSize || 0 }} 章</span>
                </div>
                <div class="flex gap-2">
                  <button
                    v-if="isCurrentUser"
                    class="btn btn-ghost btn-xs"
                    @click="editStory(s.id!)"
                  >
                    编辑
                  </button>
                  <button
                    class="btn btn-primary btn-xs rounded-full px-4"
                    @click="previewStory(s.id!)"
                  >
                    阅读
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="!stories.length" class="text-center text-base-content/50 py-16">
          暂无发布的故事
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { listStories, type IStory } from "@/api/stories";
import { getUserUnlocks, type IUserStoryProgress } from "@/api/play";
import { useAuthStore } from "@/stores/modules/auth";
import { Icon } from "@iconify/vue";
import request from "@/utils/http";
import { User } from "@/api/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const paramAuthorId = route.params.authorId as string;
const paramFrom = route.params.from as string | undefined;
const paramUsername = route.params.username as string | undefined;
const stories = ref<IStory[]>([]);
const progress = ref<IUserStoryProgress[]>([]);
const activeTab = ref<"stories" | "progress">(
  stories.value.length > 0 ? "stories" : "progress"
);
const totalCount = ref(0);
const loading = ref(true);
const userInfo = ref<User>();

const isCurrentUser = computed(() => auth.getUser?.id === userInfo.value?.id);

const load = async () => {
  loading.value = true;
  try {
    // If username (with optional from) provided, fetch user record first to get id
    if (paramUsername) {
      const userPath = paramFrom
        ? `/users/${paramFrom}/${paramUsername}`
        : `/users/${paramUsername}`;
      const user = await request.get<any>({ url: userPath });
      if (user) {
        userInfo.value = user;
        const [res, prog] = await Promise.all([
          listStories({ authorId: userInfo.value!.id }),
          getUserUnlocks(userInfo.value!.id),
        ]);
        const storiesRes = res.data || [];
        stories.value = storiesRes;
        progress.value = prog || [];
        totalCount.value = res.total || storiesRes.length;
        activeTab.value = storiesRes.length > 0 ? "stories" : "progress";
      }
    }
  } finally {
    loading.value = false;
  }
};

const previewStory = (id: string, status?: string) => {
  router.push({
    name: status == "published" ? "play" : "test",
    params: { storyId: id },
  });
};
const editStory = (id: string) => {
  router.push({ name: "story-editor", params: { storyId: id } });
};

onMounted(() => {
  load();
});

function statusLabel(status?: string) {
  switch (status) {
    case "draft":
      return "草稿";
    case "pending":
      return "待审核";
    case "published":
      return "已发布";
    case "rejected":
      return "已拒绝";
    default:
      return "未知";
  }
}

function statusClass(status?: string) {
  switch (status) {
    case "draft":
      return "badge-ghost";
    case "pending":
      return "badge-warning";
    case "published":
      return "badge-success";
    case "rejected":
      return "badge-error";
    default:
      return "badge-ghost";
  }
}

function logout() {
  auth.logout();
  router.push({ name: "home" });
}
</script>
