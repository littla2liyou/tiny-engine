<template>
  <div class="page-renderer">
    <!-- 渲染当前页面的 schema -->
    <SchemaRenderer :schema="currentSchema" />

    <!-- 渲染嵌套路由 -->
    <router-view v-if="hasChildRoutes" />
  </div>
</template>

<script setup>
import SchemaRenderer from '../renderer/RenderMain'
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

// 直接使用路由 meta 中的页面 schema
const currentSchema = computed(() => {
  return (route.meta && route.meta.pageSchema) || {}
})

// 检查是否有子路由
const hasChildRoutes = computed(() => {
  return route.meta.hasChildren || false
})
</script>
