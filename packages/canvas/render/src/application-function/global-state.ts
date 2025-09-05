import { ref, reactive, watchEffect } from 'vue'
import { reset, newFn } from '../data-utils'
import { useContext } from '../page-block-function/context'
import { useUtils } from './utils'
import { useBridge } from './bridge'
import { useDataSourceMap } from './data-source-map'

export function useGlobalState() {
  const globalState = ref([])
  const stores = reactive({})

  // 存储 getters 函数，避免重复创建
  const storeGetters = new Map<string, Record<string, () => any>>()

  const getRuntimeContext = () => {
    const { context: globalContext } = useContext()
    const { utils } = useUtils(globalContext)
    const { bridge } = useBridge()
    const { getDataSourceMap } = useDataSourceMap()

    return {
      utils: utils || {},
      bridge: bridge || {},
      stores: stores || {},
      dataSourceMap: getDataSourceMap() || {},
      emit: () => {},
      ...globalContext
    }
  }

  // 创建可执行的函数，待优化: 在createStore.vue和Main.vue中添加格式提示只支持存储function
  const createJSFunction = (functionBody: string, context: any) => {
    try {
      if (!functionBody) return null
      return newFn('return ' + functionBody).bind(context)()
    } catch {
      return null
    }
  }

  // 创建 action 函数
  const createAction = (functionBody: string, reactiveState: any, runtimeContext: any) => {
    if (!functionBody) return () => {}

    try {
      const actionContext = {
        ...runtimeContext,
        state: reactiveState,
        ...reactiveState
      }

      const actionFn = createJSFunction(functionBody, actionContext)
      return actionFn || (() => {})
    } catch {
      return () => {}
    }
  }

  const setGlobalState = (data = []) => {
    globalState.value = data
  }

  // 监听 stores 变化，触发 getters 重新执行
  watchEffect(() => {
    const runtimeContext = getRuntimeContext()

    Object.keys(stores).forEach((storeId) => {
      const store = stores[storeId]
      const getters = storeGetters.get(storeId) || {}

      // 访问 store 属性建立响应式依赖
      Object.keys(store as any).forEach((key: string) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        ;(store as any)[key]
      })

      // 重新执行 getters
      Object.keys(getters).forEach((getterKey) => {
        try {
          const getterFn = getters[getterKey]
          const result = getterFn.call({
            ...runtimeContext,
            state: store,
            ...store
          })

          // 更新 store 中的 getter 值
          ;(store as any)[getterKey] = result
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Getter ${getterKey} 执行失败:`, error)
        }
      })
    })
  })

  // 初始化时创建 stores 和 getters
  const initializeStores = () => {
    reset(stores)

    globalState.value.forEach(({ id, state = {}, getters = {}, actions = {} }) => {
      // 创建响应式 state
      const reactiveState = reactive(state)

      // 存储 getters 函数
      const getterFunctions = Object.keys(getters).reduce((acc, key) => {
        const fn = createJSFunction(getters[key].value, reactiveState)
        if (fn) {
          acc[key] = fn as () => any
        }
        return acc
      }, {} as Record<string, () => any>)

      storeGetters.set(id, getterFunctions)

      // 创建 actions
      const executableActions = Object.keys(actions).reduce((acc, key) => {
        acc[key] = createAction(actions[key].value, reactiveState, getRuntimeContext())
        return acc
      }, {} as Record<string, any>)

      // 合并到 stores
      ;(stores as any)[id] = {
        ...reactiveState,
        ...executableActions
      }
    })
  }

  // 监听 globalState 变化，重新初始化
  watchEffect(() => {
    initializeStores()
  })

  return {
    globalState,
    setGlobalState,
    stores
  }
}
