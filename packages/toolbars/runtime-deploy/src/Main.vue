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
import { runtimeDeploy } from '@opentiny/tiny-engine-common/js/runtime-deploy'
import { useLayout, useNotify, getOptions } from '@opentiny/tiny-engine-meta-register'
import meta from '../meta'
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
    const deploy = async () => {
      const { beforeDeploy, deployMethod, afterDeploy } = getOptions(meta.id)

      try {
        if (typeof beforeDeploy === 'function') {
          await beforeDeploy()
        }

        if (typeof deployMethod === 'function') {
          const stop = await deployMethod()

          if (stop) {
            return
          }
        }
      } catch (error) {
        useNotify({
          type: 'error',
          message: `Error in deploying: ${error}`
        })
      }

      // 5. 检查页面状态 - 确保有内容可以部署
      if (useLayout().isEmptyPage()) {
        useNotify({
          type: 'warning',
          message: '请先创建页面'
        })

        return
      }

      runtimeDeploy()

      if (typeof afterDeploy === 'function') {
        try {
          await afterDeploy()
        } catch (error) {
          useNotify({
            type: 'error',
            message: `Error in afterDeploy: ${error}`
          })
        }
      }
    }

    return {
      deploy
    }
  }
}
</script>
