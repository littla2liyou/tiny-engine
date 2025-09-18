import { createRouter, createWebHistory } from 'vue-router'
import { watchEffect, ref } from 'vue'
import { useAppSchema } from '../composables/useAppSchema'
import PageRenderer from '../components/PageRenderer.vue'

const { pages, fetchAppSchema } = useAppSchema()
fetchAppSchema()

const router = createRouter({
  history: createWebHistory('/runtime.html'),
  routes: []
})

// 暴露到全局以便调试
if (typeof window !== 'undefined') {
  window.__DEBUG_ROUTER__ = router
  window.__DEBUG_PAGES__ = pages
}

const routesInitialized = ref(false)

// 使用 watchEffect 响应式地添加路由
watchEffect(() => {
  if (pages.value.length > 0 && !routesInitialized.value) {
    pages.value.forEach((page) => {
      router.addRoute({
        path: `/${page.meta.router}`,
        name: `${page.meta.id}`,
        component: PageRenderer,
        meta: {
          pageId: page.meta.id,
          pageName: page.meta.name,
          isHome: page.meta.isHome,
          pageSchema: page,
          pageMeta: {
            app: page.meta.app,
            creator: page.meta.creator,
            group: page.meta.group,
            depth: page.meta.depth
          }
        }
      })

      if (page.meta.isHome) {
        // eslint-disable-next-line no-console
        console.log('添加首页重定向:', `/${page.meta.router}`)
        router.addRoute({
          path: '/',
          redirect: `/${page.meta.router}`
        })
      }
    })

    routesInitialized.value = true

    // 打印调试信息
    // eslint-disable-next-line no-console
    console.log('=== 路由调试信息 ===')
    const allRoutes = router.getRoutes()
    // eslint-disable-next-line no-console
    console.log(
      '所有路由:',
      allRoutes.map((r) => ({
        path: r.path,
        name: r.name,
        redirect: r.redirect
      }))
    )
    // eslint-disable-next-line no-console
    console.log('当前 URL:', window.location.href)
    // eslint-disable-next-line no-console
    console.log('Base URL:', router.options.history.base)

    // 暴露路由信息到全局
    window.__ALL_ROUTES__ = allRoutes
    window.__ROUTES_INITIALIZED__ = true
  }
})

// 添加路由错误处理
router.onError((error) => {
  // eslint-disable-next-line no-console
  console.error('路由错误:', error)
})

// 添加 404 路由
router.addRoute({
  path: '/:pathMatch(.*)*',
  component: () => import('../components/NotFound.vue')
})

export default router
