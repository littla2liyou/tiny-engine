import path from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import { useTinyEngineBaseConfig } from '@opentiny/tiny-engine-vite-config'

export default defineConfig((configEnv) => {
  const baseConfig = useTinyEngineBaseConfig({
    viteConfigEnv: configEnv,
    root: __dirname,
    iconDirs: [path.resolve(__dirname, './node_modules/@opentiny/tiny-engine/assets/')],
    useSourceAlias: true,
    envDir: './env',
    registryPath: './registry.js'
  })

  const customConfig = {
    envDir: './env',
    publicDir: path.resolve(__dirname, './public'),
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
  }

  return mergeConfig(baseConfig, customConfig)
})
