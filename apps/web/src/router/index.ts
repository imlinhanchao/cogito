import { createRouter, createWebHashHistory } from "vue-router";
import MainLayout from "@/layouts/MainLayout.vue";
import { useAuthStore } from "@/stores/modules/auth";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: MainLayout,
      children: [
        {
          path: "/",
          name: "home",
          component: () => import("@/views/HomeView.vue"),
          meta: {
            title: "首页",
          },
        },
        {
          path: "/story-editor/:storyId?",
          name: "story-editor",
          component: () => import("@/views/StoryEditorView.vue"),
          meta: {
            title: "故事编辑器",
            loginRequired: true,
          },
        },
        {
          path: "/stories",
          name: "story-list",
          component: () => import("@/views/StoryListView.vue"),
          meta: { title: "故事列表" },
        },
        {
          path: "/my-stories",
          name: "my-story-list",
          component: () => import("@/views/StoryListView.vue"),
          meta: { title: "我的故事", loginRequired: true },
        },
        {
          path: "/play/:storyId",
          name: "play",
          component: () => import("@/views/PlayView.vue"),
          meta: { title: "游玩", loginRequired: true },
        },
        {
          path: "/test/:storyId",
          name: "test",
          component: () => import("@/views/PlayView.vue"),
          meta: { title: "测试", loginRequired: true },
        },
        {
          path: "/admin/reviews",
          name: "admin-reviews",
          component: () => import("@/views/AdminReviewView.vue"),
          meta: { title: "审核中心", loginRequired: true, adminRequired: true },
        },
        {
          path: "/admin/reviews/:id",
          name: "admin-review-detail",
          component: () => import("@/views/AdminReviewDetailView.vue"),
          meta: { title: "审核详情", loginRequired: true, adminRequired: true },
        },
        {
          path: "/:from/:username",
          name: "user-profile-from",
          component: () => import("@/views/UserProfileView.vue"),
          meta: { title: "个人主页", loginRequired: true },
        },
        {
          path: "/:username",
          name: "user-profile",
          component: () => import("@/views/UserProfileView.vue"),
          meta: { title: "个人主页", loginRequired: true },
        },
      ],
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/sys/login.vue"),
      meta: {
        title: "登录",
      },
    },
    {
      path: "/login/:source",
      name: "logining",
      component: () => import("@/views/sys/login.vue"),
      meta: {
        title: "登录中...",
      },
    },
    {
      path: "/config",
      name: "config",
      component: () => import("@/views/sys/config.vue"),
      meta: {
        title: "系统配置",
      },
    },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to) => {
  const pageTitle = to.meta.title
    ? `${to.meta.title} | 织言 · Tellory`
    : "织言 · Tellory";
  document.title = pageTitle;
  const authStore = useAuthStore();
  if (to.meta.loginRequired && !authStore.isAuthenticated) {
    return { path: "/login" };
  }
  if (to.meta.adminRequired && !authStore.isAdmin) {
    return { path: "/" };
  }
});

export default router;
