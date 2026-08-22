import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '@/views/HomeView.vue'
import PlaygroundView from '@/views/PlaygroundView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: {
        title: '首页',
      },
    },
    {
      path: '/playground',
      name: 'playground',
      component: PlaygroundView,
      meta: {
        title: '组件预览',
      },
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const pageTitle = to.meta.title ? `${to.meta.title} · Haide UI Template` : 'Haide UI Template'
  document.title = pageTitle
})

export default router
