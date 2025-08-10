<template>
  <div class="toolbar-switch-mode">
    <toolbar-base
      :content="isRuntimeMode ? '切换为设计态渲染' : '切换为运行态渲染'"
      :icon="currentIcon"
      :options="options"
      @click-api="switchMode"
    >
    </toolbar-base>
  </div>
</template>

<script lang="ts">
/* metaService: engine.toolbars.switchMode.Main */
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { ToolbarBase } from '@opentiny/tiny-engine-common'
import { useCanvas, useNotify, useLayout, useMessage } from '@opentiny/tiny-engine-meta-register'

export default {
  components: {
    ToolbarBase
  },
  props: {
    options: {
      type: Object,
      default: () => ({})
    }
  },
  setup() {
    const { canvasApi } = useCanvas()
    const { subscribe, unsubscribe } = useMessage()
    const isRuntimeMode = ref(false)
    let refreshSubscription: any = null

    const currentIcon = computed(() => {
      return isRuntimeMode.value ? 'edit' : 'video'
    })

    // 切换到设计态的方法
    const switchToDesignMode = async () => {
      isRuntimeMode.value = false

      canvasApi.value.switchRenderMode?.(false)
      useNotify({
        type: 'success',
        message: '画布刷新后已自动切换为设计态'
      })
    }

    onMounted(() => {
      // 订阅画布刷新消息
      refreshSubscription = subscribe({
        topic: 'canvas_refreshed',
        subscriber: 'switch-mode-toolbar',
        callback: () => {
          // 当画布刷新时，自动切换为设计态
          if (isRuntimeMode.value) {
            switchToDesignMode()
          }
        }
      })
    })

    onUnmounted(() => {
      // 取消订阅
      if (refreshSubscription) {
        unsubscribe(refreshSubscription)
      }
    })

    const switchMode = async () => {
      const { pageState, initData } = useCanvas()
      const { PLUGIN_NAME, activePlugin, isEmptyPage } = useLayout()
      const next = !isRuntimeMode.value
      isRuntimeMode.value = next

      // 刷新页面数据
      if (!isEmptyPage()) {
        const { currentPage } = pageState
        const api = await activePlugin(PLUGIN_NAME.AppManage, true)
        const page = await api.getPageById(currentPage.id)
        await initData(page['page_content'], page)
      }
      canvasApi.value.switchRenderMode?.(next)
      useNotify({
        type: 'success',
        message: `已切换到${next ? '运行态' : '设计态'}渲染模式`
      })
    }

    return {
      isRuntimeMode,
      currentIcon,
      switchMode
    }
  }
}
</script>
