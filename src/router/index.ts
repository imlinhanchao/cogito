import { createRouter, createWebHistory } from 'vue-router'

import HomeView from '@/views/HomeView.vue'
import PlaygroundView from '@/views/PlaygroundView.vue'
import StoryEditorView from '@/views/StoryEditorView.vue'
import StoryPlayView from '@/views/StoryPlayView.vue'

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
      path: '/story-editor',
      name: 'story-editor',
      component: StoryEditorView,
      meta: {
        title: '故事编辑器',
      },
    },
    {
      path: '/story-play/:storyId?',
      name: 'story-play',
      component: StoryPlayView,
      meta: {
        title: '故事播放',
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
