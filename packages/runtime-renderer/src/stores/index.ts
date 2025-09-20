import { defineStore } from 'pinia'
import type { StoreConfig } from '../types/config'
import type { Pinia } from 'pinia'
import { reactive } from 'vue'

// 存储已创建的 stores 实例
const storeInstances = new Map<string, any>()

export const createStores = (storesConfig: StoreConfig[], pinia: Pinia) => {
  const stores = reactive<Record<string, any>>({}) // 使用 reactive 包装 stores

  storesConfig.forEach((config) => {
    // 检查是否已经创建过该 store
    if (storeInstances.has(config.id)) {
      stores[config.id] = storeInstances.get(config.id)
      return
    }

    // 使用 defineStore 创建 Pinia store
    const useStore = defineStore(config.id, {
      state: () => ({ ...config.state }),

      getters: config.getters,

      actions: config.actions
    })

    // 创建 store 实例并绑定到 pinia
    const storeInstance = useStore(pinia)

    // 缓存创建的 store 实例
    storeInstances.set(config.id, storeInstance)
    stores[config.id] = storeInstance

    // eslint-disable-next-line no-console
    console.log(`Store ${config.id} 已创建`)
  })

  return stores
}

// 获取已创建的 store 实例
export const getStore = (id: string) => {
  return storeInstances.get(id)
}

// 清除所有 stores（用于重新初始化）
export const clearStores = () => {
  storeInstances.clear()
}
