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

import { ref } from 'vue'

export interface BridgeEvent {
  type: string
  data: any
  timestamp: number
}

export function useBridge() {
  const events = ref<BridgeEvent[]>([])
  const listeners = new Map<string, Function[]>()

  const emit = (eventType: string, data: any) => {
    const event: BridgeEvent = {
      type: eventType,
      data,
      timestamp: Date.now()
    }
    
    events.value.push(event)
    
    // 触发监听器
    const eventListeners = listeners.get(eventType)
    if (eventListeners) {
      eventListeners.forEach(listener => listener(event))
    }
    
    console.log(`[Bridge] 发射事件: ${eventType}`, event)
  }

  const on = (eventType: string, callback: Function) => {
    if (!listeners.has(eventType)) {
      listeners.set(eventType, [])
    }
    listeners.get(eventType)!.push(callback)
  }

  const off = (eventType: string, callback?: Function) => {
    if (!callback) {
      listeners.delete(eventType)
    } else {
      const eventListeners = listeners.get(eventType)
      if (eventListeners) {
        const index = eventListeners.indexOf(callback)
        if (index > -1) {
          eventListeners.splice(index, 1)
        }
      }
    }
  }

  const bridge = {
    emit,
    on,
    off,
    events
  }

  return {
    bridge
  }
}
