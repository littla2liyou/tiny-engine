import { defineStore } from 'pinia'
import { shallowReactive } from 'vue'
import type { StoreConfig } from '../types/config'
import type { Pinia } from 'pinia'

export const createStores = (storesConfig: StoreConfig[], pinia: Pinia) => {
  const stores = shallowReactive<Record<string, any>>({})

  storesConfig.forEach((config) => {
    // 使用 defineStore 创建 Pinia store
    const useStore = defineStore(config.id, {
      state: () => config.state,

      getters: config.getters,

      actions: config.actions
    })
    // 使用useStore创建 store 实例并绑定到 pinia
    stores[config.id] = useStore(pinia)
  })

  return stores
}
