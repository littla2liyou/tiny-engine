import type { PageSchema } from './schema'

export interface RouteConfig {
  path: string
  name: string
  children?: RouteConfig[]
  meta: {
    pageId: number
    pageName: string
    hasChildren: boolean
    isHome: boolean
    depth: number
    pageSchema: PageSchema
  }
}

export interface StoreConfig {
  id: string
  state: Record<string, any>
  actions: Record<string, any>
  getters: Record<string, any>
}
