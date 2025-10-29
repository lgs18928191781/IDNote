import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 扩展路由元信息类型
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue')
  },
  {
    path: '/simpleNote/:PINID',
    name: 'NoteDetail',
    component: () => import('@/views/NoteDetail.vue')
  },
  {
    path: '/post',
    name: 'PostNote',
    component: () => import('@/views/PostNote.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/draft',
    name: 'Draft',
    component: () => import('@/views/Draft.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：检查是否需要登录
router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()

  // 检查路由是否需要认证
  if (to.meta.requiresAuth && !userStore.isAuthorized) {
    // 未登录，重定向到首页
    next({ name: 'Home' })
  } else {
    // 已登录或不需要认证，允许访问
    next()
  }
})

export default router
