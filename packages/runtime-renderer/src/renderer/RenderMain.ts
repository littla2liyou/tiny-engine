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

import { h, provide, nextTick, reactive, watchEffect, ref, type PropType } from 'vue'
import Loading from './Loading.vue'
import renderer, { parseData, setPageCss as enhancedSetPageCss, clearAllPageCSS } from './index'
import { useState } from './page-function/state'
import useContext from './useContext.ts'
import { PageLifecycleWrapper } from './RuntimeLifecycle'

interface Schema {
  children?: any[]
  methods?: Record<string, any>
  state?: Record<string, any>
  css?: string
  lifeCycles?: any
  dataSource?: Record<string, any>
  props?: Record<string, any>
  utils?: any[]
  bridge?: any[]
  inputs?: any[]
  outputs?: any[]
  fileName?: string
  id?: string
}

interface Props {
  schema: Schema
}

export default {
  props: {
    schema: {
      type: Object as PropType<Schema>,
      default: () => ({})
    }
  },
  setup(props: Props) {
    const { context, setContext, getContext } = useContext()
    const reset = (obj: Record<string, any>) => {
      Object.keys(obj).forEach((key) => delete obj[key])
    }

    provide('pageContext', context)

    const pageSchema = reactive<Schema>({})
    const methods: Record<string, any> = {}
    const { state, setState } = useState({ getContext })

    // Add flag to track initialization
    let isSchemaInitialized = false

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

    // 增强 setState 以支持 pageSchema 状态保存
    const enhancedSetState = (data: Record<string, any>, clear?: boolean) => {
      if (!pageSchema.state) {
        pageSchema.state = data
      }
      setState(data, clear)
    }

    const setPageCss = (css = '') => {
      // 使用增强的CSS处理器
      enhancedSetPageCss(css, 'runtime-renderer')
    }

    const setSchema = async (data: Schema) => {
      if (!data) {
        return
      }

      const newSchema = JSON.parse(JSON.stringify(data))

      const context = {
        state
      }
      // 此处提升很重要，因为setState、initProps也会触发画布重新渲染，所以需要提升上下文环境的设置时间
      setContext(context, true)

      // 设置方法调用上下文
      setMethods(newSchema.methods, true)

      // 这里setState（会触发画布渲染），是因为状态管理里面的变量会用到props、utils、bridge、stores、methods
      enhancedSetState(newSchema.state, true)
      await nextTick()
      setPageCss(data.css || '')

      Object.assign(pageSchema, newSchema)
      isSchemaInitialized = true
    }

    // 监听 schema 变化
    watchEffect(() => {
      if (!props.schema || !Object.keys(props.schema).length) {
        return
      }

      // 检查是否是更新（非首次加载）
      const isUpdate = isSchemaInitialized && JSON.stringify(props.schema) !== JSON.stringify(pageSchema)

      // 清理之前的CSS（仅在schema更新时）
      if (isUpdate) {
        clearAllPageCSS()
      }

      setSchema(props.schema)
    })

    // 添加 refreshKey 用于强制触发重新渲染
    const refreshKey = ref(0)

    return {
      pageSchema,
      methods,
      state,
      refreshKey
    }
  },
  render(): any {
    const { pageSchema, refreshKey }: { pageSchema: Schema; refreshKey: any } = this as any

    // 渲染画布增加根节点，与出码和预览保持一致
    const rootChildrenSchema: any = {
      componentName: 'div',
      // 手动添加一个唯一的属性，后续在画布选中此节点时方便处理额外的逻辑。由于没有修改schema，不会影响出码
      props: {},
      children: pageSchema.children
    }

    return pageSchema.children?.length
      ? h(PageLifecycleWrapper, {
          schema: rootChildrenSchema,
          lifeCycles: pageSchema.lifeCycles,
          refreshKey: refreshKey.value,
          renderContent: (_state) => h(renderer, { schema: rootChildrenSchema, parent: pageSchema })
        })
      : [h(Loading)]
  }
}
