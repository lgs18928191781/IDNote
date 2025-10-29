import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 扩展路由元信息类型
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}

// 保存 Home 页面的滚动位置
let homeScrollPosition = 0
// 标记是否从 NoteDetail 返回
let isReturningFromNoteDetail = false

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta:{
      keepAlive: true
    }
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
  routes,
  scrollBehavior(to, from, savedPosition) {
    console.log("homeScrollPosition",homeScrollPosition)
    // 当返回 Home 页面且标记为从 NoteDetail 返回时，恢复之前保存的滚动位置
    if (to.name === 'Home' && isReturningFromNoteDetail) {
      isReturningFromNoteDetail = false // 重置标记
      return { top: homeScrollPosition, behavior: 'smooth' }
    }

    // 当导航到 NoteDetail 路由时，滚动到顶部
    if (to.name === 'NoteDetail') {
      return { top: 0, behavior: 'smooth' }
    }

    // 如果有保存的位置（例如使用浏览器后退按钮），恢复到该位置
    if (savedPosition) {
      return savedPosition
    }

    // 默认滚动到顶部
    return { top: 0 }
  }
})

// 路由守卫：检查是否需要登录
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  // 当从 Home 跳转到 NoteDetail 时，保存当前滚动位置
  if (from.name === 'Home' && to.name === 'NoteDetail') {
    homeScrollPosition = window.scrollY || document.documentElement.scrollTop
  }

  // 当从 NoteDetail 返回 Home 时，设置标记
  // 支持路由名称和路径模式两种方式检测
  if (to.name === 'Home' && (from.name === 'NoteDetail' || from.path.startsWith('/simpleNote/'))) {
    isReturningFromNoteDetail = true
  }

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
