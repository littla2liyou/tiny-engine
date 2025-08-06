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

import { watch, ref, reactive, nextTick } from 'vue'
import type { IPageContext } from './page-block-function'

// 运行时状态管理器 - 使用响应式对象
const runtimeState = reactive<Record<string, any>>({})
const runtimeEvents = ref<any[]>([])

// 缓存已包装的事件处理器，避免重复包装
const wrappedHandlersCache = new WeakMap<(...args: any[]) => any, (...args: any[]) => any>()

// 防抖的画布更新函数
let updateCanvasTimeout: NodeJS.Timeout | null = null
const debouncedUpdateCanvas = (updateCanvas?: () => void) => {
  if (updateCanvasTimeout) {
    clearTimeout(updateCanvasTimeout)
  }
  updateCanvasTimeout = setTimeout(() => {
    updateCanvas?.()
    updateCanvasTimeout = null
  }, 32) // 约30fps，减少更新频率
}

/**
 * 创建运行时事件包装器（缓存版本）
 */
const createRuntimeEventWrapper = (
  originalHandler: Function,
  schema: any,
  pageContext: Record<string, any>,
  updateCanvas?: () => void
) => {
  // 检查缓存
  if (wrappedHandlersCache.has(originalHandler)) {
    return wrappedHandlersCache.get(originalHandler)!
  }

  // 创建新的包装器
  const wrapper = (...args: any[]) => {
    // 先执行原有的事件处理器
    if (originalHandler && typeof originalHandler === 'function') {
      originalHandler(...args)
    }
    
    // 然后执行运行时事件处理
    const event = args[0]
    if (event && event.type) {
      // 这是一个DOM事件
      handleRuntimeEvent(event, schema, pageContext, () => {
        debouncedUpdateCanvas(updateCanvas)
      })
    } else {
      // 这是一个自定义方法调用
      handleRuntimeMethodCall(args, schema, pageContext, () => {
        debouncedUpdateCanvas(updateCanvas)
      })
    }
  }

  // 缓存包装器
  wrappedHandlersCache.set(originalHandler, wrapper)
  return wrapper
}

/**
 * 运行时数据绑定设置 - 集成到现有响应式系统
 * @param pageContext 页面上下文
 * @param setState 状态设置函数
 * @param updateCanvas 画布更新函数
 */
export function setupRuntimeDataBinding(
  pageContext: IPageContext, 
  setState?: (state: any) => void,
  updateCanvas?: () => void
) {
  // 合并所有监听器，减少重复的nextTick调用
  let pendingUpdate = false
  
  const triggerUpdate = () => {
    if (!pendingUpdate) {
      pendingUpdate = true
      nextTick(() => {
        updateCanvas?.()
        pendingUpdate = false
      })
    }
  }

  // 监听页面上下文变化，只监听顶层属性
  watch(() => pageContext.getContext(), (newContext) => {
    // eslint-disable-next-line no-console
    console.log('[Runtime] 页面上下文变化:', newContext)
    
    // 更新运行时状态
    if (newContext?.state) {
      Object.assign(runtimeState, newContext.state)
    }
    
    triggerUpdate()
  }, { deep: false })
  
  // 监听事件变化
  watch(() => pageContext.bridge?.events, (newEvents) => {
    // eslint-disable-next-line no-console
    console.log('[Runtime] 事件变化:', newEvents)
    if (newEvents) {
      runtimeEvents.value = Array.isArray(newEvents) ? [...newEvents] : []
    }
  }, { deep: false })
  
  // 监听条件变化
  watch(() => pageContext.conditions, (newConditions) => {
    // eslint-disable-next-line no-console
    console.log('[Runtime] 条件变化:', newConditions)
    triggerUpdate()
  }, { deep: false })
  
  // 监听运行时状态变化，同步到页面状态
  watch(runtimeState, (newRuntimeState) => {
    // eslint-disable-next-line no-console
    console.log('[Runtime] 运行时状态变化:', newRuntimeState)
    
    // 将运行时状态同步到页面状态
    if (setState) {
      setState({
        ...pageContext.context?.state,
        ...newRuntimeState
      })
    }
    
    triggerUpdate()
  }, { deep: false })
}

/**
 * 运行时事件处理器
 * @param event 事件对象
 * @param schema 组件schema
 * @param pageContext 页面上下文
 * @param updateCanvas 画布更新函数
 */
export function handleRuntimeEvent(
  event: Event, 
  schema: any, 
  pageContext: Record<string, any>,
  updateCanvas?: () => void
) {
  const eventType = event.type
  const componentName = schema.componentName
  
  // eslint-disable-next-line no-console
  console.log(`[Runtime] 组件 ${componentName} 触发 ${eventType} 事件:`, event)
  
  // 通过bridge发送事件
  if (pageContext.bridge?.emit) {
    pageContext.bridge.emit(eventType, {
      event,
      schema,
      componentName,
      timestamp: Date.now()
    })
  }
  
  // 触发画布更新
  updateCanvas?.()
}

/**
 * 处理自定义方法调用
 */
const handleRuntimeMethodCall = (
  args: any[],
  schema: any,
  pageContext: Record<string, any>,
  updateCanvas?: () => void
) => {
  // eslint-disable-next-line no-console
  console.log(`[Runtime] 组件 ${schema.componentName} 调用方法:`, args)
  
  // 通过bridge发送方法调用事件
  if (pageContext.bridge?.emit) {
    pageContext.bridge.emit('methodCall', {
      args,
      schema,
      componentName: schema.componentName,
      timestamp: Date.now()
    })
  }
  
  // 触发画布更新
  updateCanvas?.()
}

/**
 * 运行时状态管理器 - 提供响应式状态管理
 */
export function useRuntimeState() {
  const setRuntimeState = (key: string, value: any) => {
    runtimeState[key] = value
  }
  
  const getRuntimeState = (key: string) => {
    return runtimeState[key]
  }
  
  const clearRuntimeState = () => {
    Object.keys(runtimeState).forEach(key => {
      delete runtimeState[key]
    })
  }
  
  return {
    runtimeState,
    runtimeEvents,
    setRuntimeState,
    getRuntimeState,
    clearRuntimeState
  }
}

/**
 * 获取运行时状态 - 用于在组件中访问
 */
export function getRuntimeState() {
  return runtimeState
}

/**
 * 获取运行时事件 - 用于在组件中访问
 */
export function getRuntimeEvents() {
  return runtimeEvents
}

/**
 * 包装事件处理器
 */
export function wrapEventHandler(
  originalHandler: Function,
  schema: any,
  pageContext: Record<string, any>,
  updateCanvas?: () => void
) {
  return createRuntimeEventWrapper(originalHandler, schema, pageContext, updateCanvas)
}
