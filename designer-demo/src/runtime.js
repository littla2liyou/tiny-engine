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

import 'virtual:svg-icons-register'

async function startApp() {
  // 导入runtime-renderer包的初始化函数（开发模式）
  const { initRuntimeRenderer } = await import('../../packages/runtime-renderer/index.ts')
  // 使用runtime-renderer包的初始化函数
  initRuntimeRenderer()
}

startApp()
