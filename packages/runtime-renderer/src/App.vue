<template>
  <SchemaRenderer :schema="appSchema" />
</template>

<script setup>
import SchemaRenderer from './renderer/RenderMain'
import mockSchema from './mock/page1.json'
import { useAppSchema } from './composables/useAppSchema'

// 直接初始化 schema，不需要异步加载
const appSchema = mockSchema
const { initializeAppConfig, pages, globalStates, fetchAppSchema, fetchBlocks } = useAppSchema()

// 异步加载数据
const loadAppData = async () => {
  await fetchAppSchema()
  await fetchBlocks()

  // 数据加载完成后访问计算属性的值
  // eslint-disable-next-line no-console
  console.log('页面数据:', pages.value)
  // eslint-disable-next-line no-console
  console.log('全局状态:', globalStates.value)

  // 初始化应用配置
  initializeAppConfig(appSchema)
}

// 调用异步加载函数
loadAppData()
</script>
