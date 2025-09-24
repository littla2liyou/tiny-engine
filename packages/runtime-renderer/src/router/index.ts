import { createRouter, createWebHistory } from 'vue-router'
import { useAppSchema } from '../composables/useAppSchema'

// 异步初始化路由配置
async function createRouterConfig() {
  const { generateRoutesConfig, fetchAppSchema } = useAppSchema()
  await fetchAppSchema()

  const routes: any[] = []
  const routesConfig = generateRoutesConfig()

  routesConfig.forEach((page) => {
    routes.push(page)
    if (page.meta.isHome) {
      routes.push({ path: '/', redirect: `${page.path}` })
    }
  })

  routes.push({
    path: '/:pathMatch(.*)*',
    component: () => import('../components/NotFound.vue')
  })

  return routes
}

export async function createAppRouter() {
  const routes = await createRouterConfig()
  const router = createRouter({ history: createWebHistory('/runtime.html'), routes })
  if (typeof window !== 'undefined') {
    window.__DEBUG_ROUTER__ = router
    // eslint-disable-next-line no-console
    console.log(
      '所有路由:',
      router.getRoutes().map((r) => ({ path: r.path, name: r.name, redirect: r.redirect }))
    )
  }
  return router
}
