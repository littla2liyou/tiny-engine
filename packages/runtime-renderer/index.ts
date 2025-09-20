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

import { createApp } from 'vue'
import { createAppRouter } from './src/router'
import { createPinia } from 'pinia'
import { createStores } from './src/stores'
import { useAppSchema } from './src/composables/useAppSchema'
import App from './src/App.vue'

// 初始化运行时渲染器
export const initRuntimeRenderer = async () => {
  const router = await createAppRouter()

  const { generateStoresConfig } = useAppSchema()
  const pinia = createPinia()
  const storesConfig = generateStoresConfig()
  const stores = createStores(storesConfig, pinia)

  const app = createApp(App)
  app.use(pinia).use(router).mount('#app')

  app.provide('stores', stores)
  if (typeof window !== 'undefined') {
    window.__TINY_ENGINE_STORES__ = stores
  }
  return app
}
