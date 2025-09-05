import {
  defineComponent,
  onBeforeMount,
  onMounted,
  onBeforeUnmount,
  onBeforeUpdate,
  onUpdated,
  onUnmounted,
  onErrorCaptured,
  onActivated,
  onDeactivated,
  ref,
  watchEffect,
  type PropType
} from 'vue'
import { getDesignMode, DESIGN_MODE } from './canvas-function'
import { parseData } from './data-function'
import type { IPageSchema } from './page-block-function'

// 调试日志：统一从 debug-logger 引入，便于集中控制

// 页面级生命周期执行函数
const executePageLifeCycle = (lifeCycleConfig: any, context: Record<string, any>) => {
  if (!lifeCycleConfig) {
    return
  }

  // 支持多种配置格式
  const config = lifeCycleConfig

  // 如果是 JSFunction 类型
  try {
    const fn = parseData(config, {}, context)
    if (typeof fn === 'function') {
      // 关键改动：把 context 作为实参传入，配合 this=context
      const result = fn.call(context, context)
      return result
    }
  } catch (error) {
    // 静默处理错误
  }
}

// 响应式页面生命周期管理器
const createReactiveLifecycleManager = (pageContext: any, entry: boolean) => {
  let isInitialized = false

  const executeLifecycle = (hookName: string, schema: any) => {
    // 只让主实例 (entry: true) 执行生命周期
    if (!entry) {
      return
    }

    // 直接使用Vue3标准名称查找
    let lifecycleConfig = null

    // 首先检查 lifeCycles 对象
    if (schema?.lifeCycles?.[hookName]) {
      lifecycleConfig = schema.lifeCycles[hookName]
    }

    if (!lifecycleConfig) {
      return
    }

    const context = pageContext.getContext()

    executePageLifeCycle(lifecycleConfig, context)
  }

  // 初始化生命周期（在 Vue onBeforeMount 中调用）
  const initializeBeforeMount = (schema: any) => {
    executeLifecycle('onBeforeMount', schema)
  }

  // 挂载后生命周期（在 Vue onMounted 中调用）
  const initializeMounted = (schema: any) => {
    if (isInitialized) {
      return
    }

    executeLifecycle('onMounted', schema)
    isInitialized = true
  }

  // 更新前生命周期（在 Vue onBeforeUpdate 中调用）
  const handleBeforeUpdate = (schema: any) => {
    if (!isInitialized) {
      return
    }

    executeLifecycle('onBeforeUpdate', schema)
  }

  // 更新后生命周期（在 Vue onUpdated 中调用）
  const handleUpdated = (schema: any) => {
    if (!isInitialized) {
      return
    }

    executeLifecycle('onUpdated', schema)
  }

  // 销毁生命周期（在 Vue onBeforeUnmount 中调用）
  const handleBeforeUnmount = (schema: any) => {
    executeLifecycle('onBeforeUnmount', schema)
    isInitialized = false
  }

  // 卸载后生命周期（在 Vue onUnmounted 中调用）
  const handleUnmounted = (schema: any) => {
    executeLifecycle('onUnmounted', schema)
  }

  // 错误捕获生命周期（在 Vue onErrorCaptured 中调用）
  const handleErrorCaptured = (schema: any, _error: Error, _instance: any, _info: string) => {
    executeLifecycle('onErrorCaptured', schema)
  }

  // 激活生命周期（在 Vue onActivated 中调用）
  const handleActivated = (schema: any) => {
    executeLifecycle('onActivated', schema)
  }

  // 停用生命周期（在 Vue onDeactivated 中调用）
  const handleDeactivated = (schema: any) => {
    executeLifecycle('onDeactivated', schema)
  }

  // Setup 生命周期（在组件 setup 阶段调用）
  const handleSetup = (schema: any) => {
    executeLifecycle('setup', schema)
  }

  return {
    initializeBeforeMount,
    initializeMounted,
    handleBeforeUpdate,
    handleUpdated,
    handleBeforeUnmount,
    handleUnmounted,
    handleErrorCaptured,
    handleActivated,
    handleDeactivated,
    handleSetup,
    isInitialized: () => isInitialized
  }
}

// 响应式页面组件
export const ReactivePageComponent = defineComponent({
  name: 'ReactivePageComponent',
  props: {
    schema: {
      type: Object as PropType<IPageSchema>,
      required: true
    },
    pageContext: {
      type: Object,
      required: true
    },
    renderer: {
      type: Function,
      required: true
    },
    refreshKey: {
      type: Number,
      default: 0
    },
    entry: {
      type: Boolean,
      default: false
    },
    active: {
      type: Boolean,
      default: false
    },
    pageId: {
      type: String,
      default: null
    }
  },
  setup(props) {
    // 创建响应式页面生命周期管理器
    const lifecycleManager = createReactiveLifecycleManager(props.pageContext, props.entry)

    // 调试：如需记录实例 uid 与 pageId，可在需要时启用

    // 执行 setup 生命周期（在组件初始化时立即执行）
    const currentDesignMode = getDesignMode()
    if (currentDesignMode === DESIGN_MODE.RUNTIME) {
      lifecycleManager.handleSetup(props.schema)
    }

    // 创建响应式状态，用于触发组件更新
    const reactiveState = ref({
      schema: props.schema,
      pageContext: props.pageContext,
      refreshKey: props.refreshKey,
      timestamp: Date.now(),
      // 添加页面状态变化的追踪
      stateSnapshot: null as any
    })

    // 真正监听页面上下文状态变化 - 只在运行态下执行
    watchEffect(() => {
      const currentDesignMode = getDesignMode()

      if (currentDesignMode !== DESIGN_MODE.RUNTIME) {
        return
      }

      // 获取页面上下文的最新状态
      const pageContextData = props.pageContext.getContext()

      // 真正监听页面上下文中的响应式数据
      // 这些数据的变化会触发 watchEffect 重新执行
      const { state, stores } = pageContextData

      // 监听状态变化 - 建立响应式依赖
      if (state) {
        // 访问 state 的各个属性，建立响应式依赖
        Object.keys(state).forEach((key) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          state[key] // 这里访问会建立响应式依赖
        })
      }

      // 监听 stores 变化 - 建立响应式依赖
      if (stores) {
        Object.keys(stores).forEach((key) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          stores[key] // 这里访问会建立响应式依赖
        })
      }

      // 监听数据源变化 - 建立响应式依赖
      const dataSourceMap = pageContextData.dataSourceMap
      if (dataSourceMap) {
        Object.keys(dataSourceMap).forEach((key) => {
          const dataSource = dataSourceMap[key]
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          dataSource // 这里访问会建立响应式依赖

          // 运行态下监听数据源状态变化
          if (currentDesignMode === DESIGN_MODE.RUNTIME) {
            // 监听数据源状态
            if (dataSource.status) {
              // 如果数据源有错误，静默处理
            }
          }
        })
      }

      // 创建状态快照，用于追踪变化
      const stateSnapshot = {
        state: state ? JSON.stringify(state) : null,
        stores: stores ? JSON.stringify(stores) : null,
        dataSourceMap: dataSourceMap ? JSON.stringify(dataSourceMap) : null
      }

      // 更新响应式状态，这会触发组件重新渲染
      const newTimestamp = Date.now()
      reactiveState.value = {
        schema: props.schema,
        pageContext: props.pageContext,
        refreshKey: props.refreshKey,
        timestamp: newTimestamp,
        stateSnapshot
      }
    })

    // 使用 Vue 3 生命周期钩子 - 只处理运行态
    onBeforeMount(() => {
      const currentDesignMode = getDesignMode()

      if (currentDesignMode === DESIGN_MODE.RUNTIME) {
        lifecycleManager.initializeBeforeMount(props.schema)
      }
    })

    onMounted(() => {
      const currentDesignMode = getDesignMode()

      if (currentDesignMode === DESIGN_MODE.RUNTIME) {
        lifecycleManager.initializeMounted(props.schema)
      }
    })

    onBeforeUnmount(() => {
      const currentDesignMode = getDesignMode()

      if (currentDesignMode === DESIGN_MODE.RUNTIME) {
        lifecycleManager.handleBeforeUnmount(props.schema)
      }
    })

    onBeforeUpdate(() => {
      const currentDesignMode = getDesignMode()

      if (currentDesignMode === DESIGN_MODE.RUNTIME) {
        lifecycleManager.handleBeforeUpdate(props.schema)
      }
    })

    onUpdated(() => {
      const currentDesignMode = getDesignMode()

      if (currentDesignMode === DESIGN_MODE.RUNTIME) {
        lifecycleManager.handleUpdated(props.schema)
      }
    })

    onUnmounted(() => {
      const currentDesignMode = getDesignMode()

      if (currentDesignMode === DESIGN_MODE.RUNTIME) {
        lifecycleManager.handleUnmounted(props.schema)
      }
    })

    // 错误捕获生命周期
    onErrorCaptured((_error: Error, _instance: any, _info: string) => {
      const currentDesignMode = getDesignMode()

      if (currentDesignMode === DESIGN_MODE.RUNTIME) {
        lifecycleManager.handleErrorCaptured(props.schema, _error, _instance, _info)
      }
    })

    // 激活生命周期（用于 keep-alive 组件）
    onActivated(() => {
      const currentDesignMode = getDesignMode()

      if (currentDesignMode === DESIGN_MODE.RUNTIME) {
        lifecycleManager.handleActivated(props.schema)
      }
    })

    // 停用生命周期（用于 keep-alive 组件）
    onDeactivated(() => {
      const currentDesignMode = getDesignMode()

      if (currentDesignMode === DESIGN_MODE.RUNTIME) {
        lifecycleManager.handleDeactivated(props.schema)
      }
    })

    return () => {
      // 读取响应式状态，确保变化时触发重新渲染
      const state = reactiveState.value

      // 渲染页面内容
      return props.renderer(state.schema, state.refreshKey, props.entry, props.active, !!props.pageId)
    }
  }
})

export default ReactivePageComponent
