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

import { getMergeMeta } from '@opentiny/tiny-engine-meta-register'
import { isDevelopEnv } from './environments'

let runtimeWindow = null
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

  return { openUrl }
}

export const runtimeDeploy = async () => {
  const { openUrl } = await deployPage()

  // 若已打开运行窗口，则仅聚焦并发送一次最新 schema
  if (runtimeWindow && !runtimeWindow.closed) {
    try {
      runtimeWindow.focus()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[runtime-deploy] focus runtime window failed:', e)
    }
    return
  }

  // 打开（或复用命名）窗口
  runtimeWindow = window.open(openUrl, 'tiny-engine-runtime')
}
