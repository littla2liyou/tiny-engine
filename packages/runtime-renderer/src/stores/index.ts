import { defineStore } from 'pinia'
import type { StoreConfig } from '../types/config'
import type { Pinia } from 'pinia'

export const createStores = (storesConfig: StoreConfig[], pinia: Pinia) => {
  const stores = <Record<string, any>>{}

  storesConfig.forEach((config) => {
    // 使用 defineStore 创建 Pinia store
    const useStore = defineStore(config.id, {
      state: () => JSON.parse(JSON.stringify(config.state)),

      getters: config.getters,

      actions: config.actions
    })

    // 使用useStore创建 store 实例并绑定到 pinia
    const storeInstance = useStore(pinia)

    stores[config.id] = storeInstance
  })

  return stores
}
