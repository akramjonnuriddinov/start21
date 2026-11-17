import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import HomeView from './views/HomeView.vue'
import LessonView from './views/LessonView.vue'
import WelcomeView from './views/WelcomeView.vue'
import GroupView from './views/GroupView.vue'
import { useAuth } from './composables/useAuth'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/lesson/:id', name: 'lesson', component: LessonView, props: true },
    { path: '/group', name: 'group', component: GroupView },
    { path: '/welcome', name: 'welcome', component: WelcomeView, meta: { public: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const { user, restore } = useAuth()
  await restore()
  if (to.meta.public) return user.value ? '/' : true
  if (!user.value) return { name: 'welcome', query: to.fullPath !== '/' ? { next: to.fullPath } : {} }
  return true
})

createApp(App).use(router).mount('#app')
