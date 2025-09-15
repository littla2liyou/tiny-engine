/**
 * Copyright (c) 2023 - present TinyEngine Authors.
 * Copyright (c) 2023 - present Huawei Cloud Computing Technologies Co., Ltd.
 *
 * Use of this source code is governed by an MIT-style license.
 *
 * THE OPEN SOURCE SOFTWARE IN THIS PRODUCT IS DISTRIBUTED IN THE HOPE THAT IT WILL BE USEFUL,
 * BUT WITHOUT ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS FOR
 * A PARTICULAR PURPOSE. SEE THE APPLICABLE LICENSES FOR MORE DETAILS.
 *
 */

import {
  defineComponent,
  inject,
  onBeforeMount,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  onErrorCaptured,
  onActivated,
  onDeactivated,
  watchEffect,
  ref,
  type PropType
} from 'vue'
import { Notify } from '@opentiny/vue'
import { parseData } from './parser'

interface JSFunction {
  type: 'JSFunction'
  value: string
}

interface LifecycleConfig {
  setup?: JSFunction
  onBeforeMount?: JSFunction
  onMounted?: JSFunction
  onBeforeUpdate?: JSFunction
  onUpdated?: JSFunction
  onBeforeUnmount?: JSFunction
  onUnmounted?: JSFunction
  onErrorCaptured?: JSFunction
  onActivated?: JSFunction
  onDeactivated?: JSFunction
}

// 执行用户定义的生命周期函数
const executeUserLifecycle = (hookName: string, lifeCycleConfig: JSFunction | undefined, context: any) => {
  if (!lifeCycleConfig || lifeCycleConfig.type !== 'JSFunction') {
    return
  }

  try {
    const fn = parseData(lifeCycleConfig, {}, context)
    if (typeof fn === 'function') {
      fn.call(context, context)
    }
  } catch (error) {
    Notify({
      type: 'warning',
      title: `${hookName} 生命周期执行失败`,
      message: (error as any)?.message || `${hookName} 生命周期函数执行报错，请检查语法`
    })
  }
}

// 页面级生命周期包裹器
export const PageLifecycleWrapper = defineComponent({
  name: 'PageLifecycleWrapper',
  props: {
    schema: {
      type: Object as PropType<any>,
      required: true
    },
    lifeCycles: {
      type: Object as PropType<LifecycleConfig>,
      default: () => ({})
    },
    refreshKey: {
      type: Number,
      default: 0
    },
    // 直接传递要渲染的内容，而不是使用 slots
    renderContent: {
      type: Function as PropType<(state: any) => any>,
      required: true
    }
  },
  setup(props) {
    const pageContext = inject('pageContext') as any
    let isInitialized = false

    // setup 生命周期 - 在组件创建时立即执行
    if (props.lifeCycles.setup) {
      executeUserLifecycle('setup', props.lifeCycles.setup, pageContext)
    }

    // 创建响应式状态，用于监听变化
    const reactiveState = ref({
      schema: props.schema,
      refreshKey: props.refreshKey,
      timestamp: Date.now(),
      // 添加页面状态变化的追踪
      stateSnapshot: null as any
    })

    // 监听页面状态变化，触发更新生命周期
    watchEffect(() => {
      if (!isInitialized) {
        return
      }

      // 获取页面上下文的最新状态 - 关键：使用 pageContext.getContext()
      const pageContextData = pageContext.getContext()

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
        refreshKey: props.refreshKey,
        timestamp: newTimestamp,
        stateSnapshot
      }
    })

    // onBeforeMount 生命周期
    onBeforeMount(() => {
      executeUserLifecycle('onBeforeMount', props.lifeCycles.onBeforeMount, pageContext)
    })

    // onMounted 生命周期
    onMounted(() => {
      executeUserLifecycle('onMounted', props.lifeCycles.onMounted, pageContext)
      isInitialized = true // 标记为已初始化，允许更新生命周期执行
    })

    // onBeforeUpdate 生命周期
    onBeforeUpdate(() => {
      if (isInitialized) {
        executeUserLifecycle('onBeforeUpdate', props.lifeCycles.onBeforeUpdate, pageContext)
      }
    })

    // onUpdated 生命周期
    onUpdated(() => {
      if (isInitialized) {
        executeUserLifecycle('onUpdated', props.lifeCycles.onUpdated, pageContext)
      }
    })

    // onBeforeUnmount 生命周期
    onBeforeUnmount(() => {
      executeUserLifecycle('onBeforeUnmount', props.lifeCycles.onBeforeUnmount, pageContext)
      isInitialized = false // 重置初始化状态
    })

    // onUnmounted 生命周期
    onUnmounted(() => {
      executeUserLifecycle('onUnmounted', props.lifeCycles.onUnmounted, pageContext)
    })

    // onErrorCaptured 生命周期
    onErrorCaptured((error, instance, info) => {
      if (props.lifeCycles.onErrorCaptured) {
        try {
          const fn = parseData(props.lifeCycles.onErrorCaptured, {}, pageContext)
          if (typeof fn === 'function') {
            // 将错误信息传递给用户函数
            const result = fn.call(pageContext, error, instance, info)
            // 如果用户函数返回false，阻止错误继续传播
            return result === false
          }
        } catch (userError) {
          Notify({
            type: 'warning',
            title: 'onErrorCaptured 生命周期执行失败',
            message: (userError as any)?.message || 'onErrorCaptured 生命周期函数执行报错，请检查语法'
          })
        }
      }
      // 默认让错误继续传播
      return true
    })

    // onActivated 生命周期 (keep-alive 组件激活时)
    onActivated(() => {
      executeUserLifecycle('onActivated', props.lifeCycles.onActivated, pageContext)
    })

    // onDeactivated 生命周期 (keep-alive 组件失活时)
    onDeactivated(() => {
      executeUserLifecycle('onDeactivated', props.lifeCycles.onDeactivated, pageContext)
    })

    // 返回渲染函数，确保响应式状态变化时触发重新渲染
    return () => {
      // 读取响应式状态，确保变化时触发重新渲染
      const state = reactiveState.value

      // 渲染页面内容 - 关键：传递 state 参数，确保每次都是新的渲染
      return props.renderContent(state)
    }
  }
})

export default {
  PageLifecycleWrapper
}
