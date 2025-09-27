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

import { nextTick, inject } from 'vue'
import { parseData, getCSSHandler } from '../index'
import { useState } from './state.ts'
import useContext from '../useContext.ts'
import type { PageContent as Schema } from '../../types/schema.ts'
import dataSourceMap from '../../app-function/dataSource.js'
import { getUtilsAll } from '../../app-function/utils.ts'

const { context, setContext, getContext } = useContext()
const reset = (obj: Record<string, any>) => {
  Object.keys(obj).forEach((key) => delete obj[key])
}
const stores = inject('stores')

const methods: Record<string, any> = {}
const { state, setState } = useState({ getContext })
const setMethods = (data: Record<string, any> = {}, clear?: boolean) => {
  if (clear) reset(methods)
  // 这里有些方法在画布还是有执行的必要的，比如说表格的renderer和formatText方法，包括一些自定义渲染函数
  Object.assign(
    methods,
    Object.fromEntries(
      Object.keys(data).map((key) => {
        return [key, parseData(data[key], {}, getContext())]
      })
    )
  )
  setContext(methods)
}

const setSchema = async (data: Schema) => {
  if (!data) {
    return
  }

  const newSchema = JSON.parse(JSON.stringify(data))

  const context = {
    state,
    stores,
    dataSourceMap,
    utils: getUtilsAll()
  }
  // 此处提升很重要，因为setState、initProps也会触发画布重新渲染，所以需要提升上下文环境的设置时间
  setContext(context, true)

  // 设置方法调用上下文
  setMethods(newSchema.methods, true)

  // 这里setState（会触发画布渲染），是因为状态管理里面的变量会用到props、utils、bridge、stores、methods
  setState(newSchema.state, true)
  await nextTick()

  // 使用专门的处理器处理block CSS
  const cssHandler = getCSSHandler({ enableScoped: true })
  cssHandler.setPageCss(data.css || '', `block-${data.fileName || 'unknown'}`)
}

export const getBlockContext = (schema: Schema) => {
  setSchema(schema)
  return context
}
