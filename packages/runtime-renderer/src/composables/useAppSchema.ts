import { ref, computed, readonly } from 'vue'
import type {
  AppSchema,
  ComponentMap,
  DataSourceConfig,
  Util,
  PackageConfig,
  BlockItem,
  BlockContent
} from '../types/schema'
import { initUtils } from '../app-function/utils'
import appSchemaMock from '../mock/appSchema.json'
import blocksMock from '../mock/blocks.json'

const appSchema = ref<AppSchema | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

export function useAppSchema() {
  // 初始化组件映射表
  const initializeComponentsMap = (componentsMap: ComponentMap[]) => {
    // eslint-disable-next-line no-console
    console.log('初始化组件映射表:', componentsMap.length, '个组件')

    // 这里可以处理组件依赖加载
    componentsMap.forEach((component) => {
      if (component.package && component.dependencies) {
        // eslint-disable-next-line no-console
        console.log(`加载组件: ${component.componentName} from ${component.package}`)
        // 实际项目中这里会动态加载组件库
      }
    })
  }

  // 初始化数据源
  const initializeDataSources = (dataSource: DataSourceConfig) => {
    // eslint-disable-next-line no-console
    console.log('初始化数据源:', dataSource.list.length, '个数据源')

    dataSource.list.forEach((source) => {
      // eslint-disable-next-line no-console
      console.log(`数据源: ${source.name} (${source.data.type})`)
      // 这里可以预加载数据源配置
    })
  }

  // 初始化工具函数
  const initializeUtils = async (utils: Util[]) => {
    // eslint-disable-next-line no-console
    console.log('初始化工具函数:', utils.length, '个函数')

    try {
      await initUtils(utils)
      // eslint-disable-next-line no-console
      console.log('工具函数初始化完成')
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('工具函数初始化失败:', error)
    }
  }

  // 初始化包依赖
  const initializePackages = (packages: PackageConfig[]) => {
    // eslint-disable-next-line no-console
    console.log('初始化包依赖:', packages.length, '个包')

    packages.forEach((pkg) => {
      // eslint-disable-next-line no-console
      console.log(`包: ${pkg.name}@${pkg.version}`)
      // 这里会动态加载CSS和JS资源
    })
  }

  // 注入全局CSS
  const injectGlobalCSS = (css: string) => {
    if (!css) return

    // eslint-disable-next-line no-console
    console.log('注入全局CSS：{ css.length } 字符')
    // 创建style标签并注入CSS
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
  }

  // 初始化应用配置
  const initializeAppConfig = async (schema: AppSchema) => {
    if (!schema?.data) return

    // 1. 初始化组件映射表
    initializeComponentsMap(schema.data.componentsMap)

    // 2. 初始化数据源
    initializeDataSources(schema.data.dataSource)

    // 4. 初始化工具函数
    initializeUtils(schema.data.utils)

    // 5. 初始化包依赖
    initializePackages(schema.data.packages)

    // 6. 注入全局CSS
    injectGlobalCSS(schema.data.css)
  }

  // 拉取完整应用schema
  const fetchAppSchema = async (_appId?: string) => {
    isLoading.value = true
    error.value = null

    try {
      // 使用mock数据，实际项目中这里会调用API
      const response = appSchemaMock as unknown as AppSchema
      appSchema.value = response

      // 解析并初始化应用级配置
      await initializeAppConfig(response)

      // eslint-disable-next-line no-console
      console.log('应用Schema加载成功:', response)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载应用Schema失败'
      // eslint-disable-next-line no-console
      console.error('加载应用Schema失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 拉取区块schema
  // 在 useAppSchema.ts 中
  const fetchBlocks = async (_appId?: string) => {
    const response = blocksMock.data as unknown as BlockItem[]

    // 转换为组件映射格式
    const blocksMap: Record<
      string,
      {
        schema: BlockContent
        meta: {
          id: number
          label: string
          framework: string
          version: string
        }
      }
    > = {}
    response.forEach((block) => {
      if (block.content) {
        blocksMap[block.label] = {
          schema: block.content,
          meta: {
            id: block.id,
            label: block.label,
            framework: block.framework,
            version: block.version
          }
        }
      }
    })

    window.blocks = blocksMap
    // eslint-disable-next-line no-console
    console.log('区块数据已加载到 window.blocks:', window.blocks)
  }

  // 获取页面列表
  const pages = computed(() => {
    if (!appSchema.value?.data?.componentsTree) return []
    return appSchema.value.data.componentsTree
  })

  // 根据路由获取页面
  const getPageByRoute = (route: string) => {
    if (!pages.value) return null
    return pages.value.find((page) => page.meta.router === route)
  }

  // 根据ID获取页面
  const getPageById = (id: number) => {
    if (!pages.value) return null
    return pages.value.find((page) => page.meta.id === id)
  }

  // 获取默认页面（首页）
  const defaultPage = computed(() => {
    if (!pages.value) return null
    return pages.value.find((page) => page.meta.isHome) || pages.value[0]
  })

  // 获取应用配置
  const appConfig = computed(() => {
    return appSchema.value?.data?.config || null
  })

  // 获取应用元信息
  const appMeta = computed(() => {
    return appSchema.value?.data?.meta || null
  })

  // 获取组件映射表
  const componentsMap = computed(() => {
    return appSchema.value?.data?.componentsMap || []
  })

  // 获取数据源配置
  const dataSourceConfig = computed(() => {
    return appSchema.value?.data?.dataSource || {}
  })

  // 获取全局状态配置
  const globalStates = computed(() => {
    return appSchema.value?.data?.meta?.globalState || []
  })

  // 获取包依赖
  const packages = computed(() => {
    return appSchema.value?.data?.packages || []
  })

  // 检查应用是否已加载
  const isAppLoaded = computed(() => {
    return !!appSchema.value
  })

  return {
    // 状态
    appSchema: readonly(appSchema),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // 计算属性
    pages,
    defaultPage,
    appConfig,
    appMeta,
    componentsMap,
    dataSourceConfig,
    globalStates,
    packages,
    isAppLoaded,

    // 方法
    fetchAppSchema,
    fetchBlocks,
    getPageByRoute,
    getPageById,

    // 初始化方法
    initializeAppConfig,
    initializeDataSources,
    initializePackages,
    injectGlobalCSS
  }
}
