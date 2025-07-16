<template>
  <div class="toolbar-switch-mode">
    <toolbar-base
      :content="isRuntimeMode ? '切换为设计态' : '切换为运行态'"
      :icon="currentIcon"
      :options="options"
      @click-api="switchMode"
    >
    </toolbar-base>
  </div>
</template>

<script lang="ts">
/* metaService: engine.toolbars.switchMode.Main */
import { computed, ref } from 'vue'
import { useNotify } from '@opentiny/tiny-engine-meta-register'
import { ToolbarBase } from '@opentiny/tiny-engine-common'

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
    // 当前是否为运行态模式
    const isRuntimeMode = ref(false)

    // 根据当前模式计算显示的图标
    const currentIcon = computed(() => {
      return isRuntimeMode.value ? 'edit' : 'box'
    })

    const switchMode = async () => {
      // 仅UI测试：简单的状态切换
      isRuntimeMode.value = !isRuntimeMode.value

      useNotify({
        type: 'success',
        message: `已切换到${isRuntimeMode.value ? '运行态' : '设计态'}模式（测试模式）`
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
