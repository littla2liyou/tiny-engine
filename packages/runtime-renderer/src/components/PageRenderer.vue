<template>
  <SchemaRenderer :schema="currentSchema" />
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
</script>
