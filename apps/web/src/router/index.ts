import { createRouter, createWebHashHistory } from "vue-router";
import MainLayout from "@/layouts/MainLayout.vue";

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
          meta: { title: "我的故事" },
        },
        {
          path: "/story-play/:storyId?",
          name: "story-play",
          component: () => import("@/views/StoryPlayView.vue"),
          meta: {
            title: "故事播放",
          },
        }
        ,
        {
          path: "/admin/reviews",
          name: "admin-reviews",
          component: () => import("@/views/AdminReviewView.vue"),
          meta: { title: "审核中心" },
        }
        ,
        {
          path: "/admin/reviews/:id",
          name: "admin-review-detail",
          component: () => import("@/views/AdminReviewDetailView.vue"),
          meta: { title: "审核详情" },
        }
        ,
        {
          path: "/:from/:username",
          name: "user-profile-from",
          component: () => import("@/views/UserProfileView.vue"),
          meta: { title: "个人主页" },
        },
        {
          path: "/:username",
          name: "user-profile",
          component: () => import("@/views/UserProfileView.vue"),
          meta: { title: "个人主页" },
        }
      ]
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
    }
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
});

export default router;
