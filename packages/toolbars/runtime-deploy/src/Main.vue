<template>
  <div class="toolbar-deploy">
    <toolbar-base
      content="在线部署运行"
      :icon="options.icon?.default || options?.icon"
      :options="options"
      @click-api="deploy"
    >
    </toolbar-base>
  </div>
</template>

<script lang="ts">
/* metaService: engine.toolbars.runtime-deploy.Main */
import { deployPage } from '@opentiny/tiny-engine-common/js/runtime-deploy'
import { useLayout, useNotify } from '@opentiny/tiny-engine-meta-register'
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
    const deploy = () => {
      if (useLayout().isEmptyPage()) {
        useNotify({
          type: 'warning',
          message: '请先创建页面'
        })

        return
      }

      deployPage()
    }

    return {
      deploy
    }
  }
}
</script>
