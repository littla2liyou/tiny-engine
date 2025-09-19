import { createRouter, createWebHistory } from 'vue-router'
import { useAppSchema } from '../composables/useAppSchema'
import PageRenderer from '../components/PageRenderer.vue'

// 异步初始化路由配置
async function createRouterConfig() {
  const { generateRoutesConfig, fetchAppSchema } = useAppSchema()

  // 等待数据加载完成
  await fetchAppSchema()

  const routes = []

  const routesConfig = generateRoutesConfig()
  // 根据页面数据生成路由配置
  routesConfig.forEach((page) => {
    routes.push({
      path: `${page.path}`,
      name: `${page.name}`,
      component: PageRenderer,
      children: page.children || [],
      meta: {
        pageId: page.meta.pageId,
        pageName: page.meta.pageName,
        isHome: page.meta.isHome,
        hasChildren: (page.children && page.children.length > 0) || false,
        pageSchema: page.meta.pageSchema,
        depth: page.meta.depth
      }
    })

    // 添加首页重定向
    if (page.meta.isHome) {
      routes.push({
        path: '/',
        redirect: `${page.path}`
      })
    }
  })

  // 添加 404 路由
  routes.push({
    path: '/:pathMatch(.*)*',
    component: () => import('../components/NotFound.vue')
  })

  return routes
}

// 创建路由实例的异步函数
export async function createAppRouter() {
  const routes = await createRouterConfig()

  const router = createRouter({
    history: createWebHistory('/runtime.html'),
    routes
  })

  // 添加路由错误处理
  router.onError((error) => {
    // eslint-disable-next-line no-console
    console.error('路由错误:', error)
  })

  // 调试信息
  if (typeof window !== 'undefined') {
    window.__DEBUG_ROUTER__ = router
    // eslint-disable-next-line no-console
    console.log('=== 路由调试信息 ===')
    // eslint-disable-next-line no-console
    console.log(
      '所有路由:',
      router.getRoutes().map((r) => ({
        path: r.path,
        name: r.name,
        redirect: r.redirect
      }))
    )
  }

  return router
}
