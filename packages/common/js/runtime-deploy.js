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

import { useMaterial, useResource, getMetaApi, META_SERVICE, getMergeMeta } from '@opentiny/tiny-engine-meta-register'
import { utils } from '@opentiny/tiny-engine-utils'
import { isDevelopEnv } from './environments'

const { deepClone } = utils
let runtimeWindow = null

const getScriptAndStyleDeps = () => {
  const { scripts, styles } = useMaterial().getCanvasDeps()
  const utilsDeps = useResource().getUtilsDeps()
  const scriptsDeps = [...scripts, ...utilsDeps].reduce((res, item) => {
    res[item.package] = res[item.package] || item.script
    return res
  }, {})
  return { scripts: scriptsDeps, styles: [...styles] }
}

const getRuntimeParams = async () => {
  const { scripts, styles } = getScriptAndStyleDeps()

  // 获取当前应用ID
  const { getBaseInfo } = getMetaApi(META_SERVICE.GlobalService)
  const appId = getBaseInfo().id

  // 只传递元数据，让运行时窗口自己获取完整数据
  return deepClone({
    appId, // 应用ID，用于运行时获取完整数据
    scripts,
    styles
  })
}

// 简化的首次/手动投递：不启用热更新，仅在打开或用户再次点击时发送一次
const sendSchemaUpdate = (data) => {
  try {
    runtimeWindow?.postMessage({ source: 'designer', type: 'schema', data }, window.location.origin)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[runtime-deploy] postMessage failed:', err)
  }
}

const setupMessageListener = () => {
  window.addEventListener('message', async (event) => {
    const parsedOrigin = new URL(event.origin)
    const parsedHost = new URL(window.location.href)
    if (parsedOrigin.origin === parsedHost.origin || parsedOrigin.host === parsedHost.host) {
      const { event: eventType, source } = event.data || {}
      if (source === 'runtime' && eventType === 'connect' && !runtimeWindow) {
        runtimeWindow = event.source
      }
    }
  })
  const channel = new BroadcastChannel('tiny-engine-runtime-channel')
  channel.postMessage({ event: 'connect', source: 'designer' })
  channel.close()
}
setupMessageListener()

const getQueryParams = () => {
  const paramsMap = new URLSearchParams(location.search)
  const tenant = paramsMap.get('tenant') || ''
  const framework = getMergeMeta('engine.config')?.dslMode
  const platform = getMergeMeta('engine.config')?.platformId

  let query = `tenant=${tenant}&id=${paramsMap.get('id')}&framework=${framework}&platform=${platform}`
  return query
}

export const deployPage = async () => {
  const href = window.location.href.split('?')[0] || './'
  const query = getQueryParams()

  const customDeployUrl = getMergeMeta('engine.toolbars.runtimeDeploy')?.options?.deployUrl
  const defaultDeployUrl = isDevelopEnv ? `./runtime.html` : `${href.endsWith('/') ? href : `${href}/`}runtime`

  let openUrl = ''
  openUrl = customDeployUrl
    ? typeof customDeployUrl === 'function'
      ? customDeployUrl(defaultDeployUrl, query)
      : `${customDeployUrl}?${query}`
    : `${defaultDeployUrl}?${query}`

  const payload = await getRuntimeParams()
  return { openUrl, payload }
}

export const runtimeDeploy = async () => {
  const { openUrl, payload } = await deployPage()

  // 若已打开运行窗口，则仅聚焦并发送一次最新 schema
  if (runtimeWindow && !runtimeWindow.closed) {
    try {
      runtimeWindow.focus()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[runtime-deploy] focus runtime window failed:', e)
    }
    sendSchemaUpdate(payload)
    return
  }

  // 打开（或复用命名）窗口
  runtimeWindow = window.open(openUrl, 'tiny-engine-runtime')

  // 首次发送 schema（延迟兜底）
  const trySend = async () => {
    if (!runtimeWindow || runtimeWindow.closed) return
    sendSchemaUpdate(payload)
  }
  setTimeout(trySend, 300)
}
