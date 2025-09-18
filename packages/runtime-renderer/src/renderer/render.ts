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

import { h, provide, inject, defineComponent } from 'vue'
import { isHTMLTag, hyphenate } from '@vue/shared'
import TinyVue, { Notify } from '@opentiny/vue'
import {
  CanvasRow,
  CanvasCol,
  CanvasRowColContainer,
  CanvasFlexBox,
  CanvasSection
} from '@opentiny/tiny-engine-builtin-component'
import {
  CanvasBox,
  CanvasIcon,
  CanvasText,
  CanvasSlot,
  CanvasImg,
  CanvasPlaceholder,
  CanvasRouterLink,
  CanvasRouterView
} from './builtin'
import { parseData, parseCondition, parseLoopArgs, generateFn, newFn } from './parser'

const hyphenateRE = /\B([A-Z])/g
const customElements = {}
// const [JS_EXPRESSION, JS_FUNCTION] = ['JSExpression', 'JSFunction']
// const isOn = (key) => /^on[A-Z]\w*/.test(key)

const Mapper = {
  Icon: CanvasIcon,
  Text: CanvasText,
  div: CanvasBox,
  Slot: CanvasSlot,
  slot: CanvasSlot,
  Template: CanvasBox,
  Img: CanvasImg,
  CanvasRow,
  CanvasCol,
  CanvasRowColContainer,
  CanvasFlexBox,
  CanvasSection,
  CanvasPlaceholder,
  RouterLink: CanvasRouterLink,
  RouterView: CanvasRouterView
}

export const collectionMethodsMap = {}

const getNative = (name) => {
  return TinyVue?.[name]
}

const getBlock = (name) => {
  return window.blocks?.[name]
}

export const getComponent = (name) => {
  // 首先尝试从映射表、原生组件、自定义元素中获取
  const component = Mapper[name] || getNative(name) || customElements[name]
  if (component) {
    return component
  }

  // 如果是 HTML 标签，直接返回
  if (isHTMLTag(name)) {
    return name
  }

  // 检查是否是区块组件
  const blockSchema = getBlock(name)
  if (blockSchema) {
    // 返回一个动态组件，用于渲染区块
    return defineComponent({
      name: `${name}`,
      props: {
        schema: Object
      },
      setup(props) {
        return () => {
          // 区块的真实内容在 window.blocks 中，而不是页面的 schema 中
          // 页面的 schema 只是区块的引用，children 为空
          const blockContent = blockSchema.schema

          // eslint-disable-next-line no-console
          console.log(`区块 ${name} 渲染:`, {
            hasPropsSchema: !!props.schema,
            hasBlockSchema: !!blockSchema.schema,
            blockContent,
            children: blockContent?.children,
            childrenLength: blockContent?.children?.length
          })

          // 递归渲染区块的 children
          // eslint-disable-next-line
          return renderGroup(blockContent.children, {}, {}, renderComponent)
        }
      }
    })
  }

  return CanvasPlaceholder
}

const configure = {}

export const setConfigure = (configureData) => {
  Object.assign(configure, configureData)
}

// 解析函数字符串结构
const parseFunctionString = (fnStr) => {
  const fnRegexp = /(async)?.*?(\w+) *\(([\s\S]*?)\) *\{([\s\S]*)\}/
  const result = fnRegexp.exec(fnStr)
  if (result) {
    return {
      type: result[1] || '',
      name: result[2],
      params: result[3]
        .split(',')
        .map((item) => item.trim())
        .filter((item) => Boolean(item)),
      body: result[4]
    }
  }
  return null
}

const _getPlainProps = (object = {}) => {
  const { slot, ...rest } = object
  const props = {}

  if (slot) {
    rest.slot = slot.name || slot
  }

  Object.entries(rest).forEach(([key, value]) => {
    let renderKey = key

    // html 标签属性会忽略大小写，所以传递包含大写的 props 需要转换为 kebab 形式的 props
    if (!/on[A-Z]/.test(renderKey) && hyphenateRE.test(renderKey)) {
      renderKey = hyphenate(renderKey)
    }

    if (['boolean', 'string', 'number'].includes(typeof value)) {
      props[renderKey] = value
    } else {
      // 如果传给webcomponent标签的是对象或者数组需要使用.prop修饰符，转化成h函数就是如下写法
      props[`.${renderKey}`] = value
    }
  })
  return props
}

const generateCollection = (schema) => {
  if (schema.componentName === 'Collection' && schema.props?.dataSource && schema.children) {
    schema.children.forEach((item) => {
      const fetchData = item.props?.fetchData
      const methodMatch = fetchData?.value?.match(/this\.(.+?)}/)
      if (fetchData && methodMatch?.[1]) {
        const methodName = methodMatch[1].trim()
        // 缓存表格fetchData对应的数据源信息
        collectionMethodsMap[methodName] = schema.props.dataSource
      }
    })
  }
}

// 解析JSX字符串为可执行函数
const parseJSXFunction = (data, ctx) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const babelPluginJSX = require('@vue/babel-plugin-jsx')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { transformSync } = require('@babel/core')

    const transformJSX = (code) => {
      const res = transformSync(code, {
        plugins: [
          [
            babelPluginJSX,
            {
              pragma: 'h'
            }
          ]
        ]
      })
      return (res.code || '')
        .replace(/import \{.+\} from "vue";/, '')
        .replace(/h\(_?resolveComponent\((.*?)\)/g, `h(this.getComponent($1)`)
        .replace(/_?resolveComponent/g, 'h')
        .replace(/_?createTextVNode\((.*?)\)/g, '$1')
        .trim()
    }

    const newValue = transformJSX(data.value)
    const fnInfo = parseFunctionString(newValue)
    if (!fnInfo) throw Error('函数解析失败，请检查格式。示例：function fnName() { }')

    return newFn(...fnInfo.params, fnInfo.body).bind({
      ...ctx,
      getComponent
    })
  } catch (error) {
    Notify({
      type: 'warning',
      title: '函数声明解析报错',
      message: error?.message || '函数声明解析报错，请检查语法'
    })

    return newFn()
  }
}

const _parseJSFunction = (data, scope, ctx) => {
  try {
    const innerFn = newFn(`return ${data.value}`).bind(ctx)()
    return generateFn(innerFn, ctx)
  } catch (error) {
    return parseJSXFunction(data, ctx)
  }
}

const renderDefault = (
  children: any[],
  scope: Record<string, any>,
  parent: any,
  renderComponent: (schema: any, scope: Record<string, any>, parent: any) => any
) => children.map?.((child) => renderComponent(child, scope, parent))

const _parseJSSlot = (data, scope, renderComponent) => {
  return ($scope) => renderDefault(data.value, { ...scope, ...$scope }, data, renderComponent)
}

const generateSlotGroup = (children, isCustomElm, schema) => {
  const slotGroup = {}

  children.forEach((child) => {
    const { componentName, children, params = [], props } = child
    const slot = child.slot || props?.slot?.name || props?.slot || 'default'
    const isNotEmptyTemplate = componentName === 'Template' && children.length

    if (isCustomElm) {
      child.props.slot = 'slot' // CE下需要给子节点加上slot标识
    }
    slotGroup[slot] = slotGroup[slot] || {
      value: [],
      params,
      parent: isNotEmptyTemplate ? child : schema
    }

    slotGroup[slot].value.push(...(isNotEmptyTemplate ? children : [child])) // template 标签直接过滤掉
  })

  return slotGroup
}

const renderSlot = (children, scope, schema, isCustomElm, context, renderComponent) => {
  if (children.some((a) => a.componentName === 'Template')) {
    const slotGroup = generateSlotGroup(children, isCustomElm, schema)
    const slots = {}

    Object.keys(slotGroup).forEach((slotName) => {
      const currentSlot = slotGroup[slotName]

      slots[slotName] = ($scope) => renderDefault(currentSlot.value, { ...scope, ...$scope }, context, renderComponent)
    })

    return slots
  }

  return { default: () => renderDefault(children, scope, context, renderComponent) }
}

const _checkGroup = (componentName) => configure[componentName]?.nestingRule?.childWhitelist?.length

const directChildrenHasTemplate = (children) => children.some((child) => child.componentName === 'Template')

const getBindProps = (schema, scope, context) => {
  const { componentName } = schema

  if (componentName === 'CanvasPlaceholder') {
    return {}
  }

  const bindProps = {
    ...parseData(schema.props, scope, context)
  }

  if (Mapper[componentName]) {
    bindProps.schema = schema
  }

  // 如果是区块组件，传递完整的 schema
  const blockSchema = getBlock(componentName)
  if (blockSchema) {
    bindProps.schema = schema
  }

  // 绑定组件属性时需要将 className 重命名为 class，防止覆盖组件内置 class
  bindProps.class = bindProps.className
  delete bindProps.className

  return bindProps
}

const getLoopScope = ({ scope, index, item, loopArgs }) => {
  return {
    ...scope,
    ...(parseLoopArgs({
      item,
      index,
      loopArgs
    }) || {})
  }
}

const injectPlaceHolder = (componentName, children) => {
  const isEmptyArr = Array.isArray(children) && !children.length

  if (configure[componentName]?.isContainer && (!children || isEmptyArr)) {
    return [
      {
        componentName: 'CanvasPlaceholder'
      }
    ]
  }

  return children
}

const renderGroup = (children, scope, context, renderComponent) => {
  return children.map?.((schema) => {
    const { componentName, children, loop, loopArgs, condition } = schema
    const loopList = parseData(loop, scope, context)

    const renderElement = (item, index) => {
      const mergeScope = getLoopScope({
        scope,
        index,
        item,
        loopArgs
      })

      if (!parseCondition(condition, mergeScope, context)) {
        return null
      }

      const renderChildren = injectPlaceHolder(componentName, children)

      const element = h(
        getComponent(componentName),
        getBindProps(schema, mergeScope, context),
        Array.isArray(renderChildren)
          ? renderSlot(renderChildren, mergeScope, schema, customElements[componentName], context, renderComponent)
          : parseData(renderChildren, mergeScope, context)
      )

      return element
    }

    return loopList?.length ? loopList.map(renderElement) : renderElement(undefined, 0)
  })
}

const getChildren = (schema, mergeScope, context, renderComponent) => {
  const { componentName, children } = schema
  const renderChildren = injectPlaceHolder(componentName, children)

  if (!Array.isArray(renderChildren)) {
    return parseData(renderChildren, mergeScope, context)
  }

  if (!renderChildren.length) {
    return null
  }

  const isCustomElm = customElements[componentName]

  if (directChildrenHasTemplate(renderChildren)) {
    return renderSlot(renderChildren, mergeScope, schema, isCustomElm, context, renderComponent)
  }

  return renderGroup(renderChildren, mergeScope, context, renderComponent)
}

function renderComponent(schema, scope, parent) {
  const { componentName, loop, loopArgs, condition } = schema

  // 处理数据源和表格fetchData的映射关系
  generateCollection(schema)

  if (!componentName) {
    return parseData(schema, scope, parent)
  }

  const component = getComponent(componentName)

  const loopList = parseData(loop, scope, parent)

  const renderElement = (item, index) => {
    const mergeScope = item
      ? getLoopScope({
          item,
          index,
          loopArgs,
          scope
        })
      : scope

    if (!parseCondition(condition, mergeScope, parent)) {
      return null
    }

    const Ele = h(
      component,
      getBindProps(schema, mergeScope, parent),
      getChildren(schema, mergeScope, parent, renderComponent)
    )

    return Ele
  }

  return loopList?.length ? loopList.map(renderElement) : renderElement(undefined, 0)
}

export const renderer = defineComponent({
  name: 'renderer',
  props: {
    schema: Object,
    scope: Object,
    parent: Object
  },
  setup(props) {
    provide('schema', props.schema)
  },
  render() {
    const context = inject('pageContext')
    const { scope, schema } = this

    return renderComponent(schema, scope, context, renderComponent)
  }
})

export default renderer
