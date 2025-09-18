<template>
  <router-view :key="$route.fullPath" />
</template>

<script setup>
import { useAppSchema } from './composables/useAppSchema'

const { fetchBlocks } = useAppSchema()

// 异步加载数据
const loadAppData = async () => {
  await fetchBlocks()
}

loadAppData()
</script>
