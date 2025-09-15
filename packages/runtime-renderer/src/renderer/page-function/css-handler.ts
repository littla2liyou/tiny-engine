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

/**
 * 增强的CSS处理器
 * 参考Canvas/Render的CSS处理机制，提供更好的样式隔离和性能
 */

interface CSSHandlerOptions {
  pageId?: string
  enableScoped?: boolean
  enableModernCSS?: boolean
}

class EnhancedCSSHandler {
  private styleSheetMap = new Map<string, CSSStyleSheet>()
  private fallbackStyleMap = new Map<string, HTMLStyleElement>()
  private options: CSSHandlerOptions

  constructor(options: CSSHandlerOptions = {}) {
    this.options = {
      enableScoped: true,
      enableModernCSS: true,
      ...options
    }
  }

  /**
   * 设置页面CSS
   * @param css CSS内容
   * @param pageId 页面ID
   */
  setPageCss(css: string = '', pageId?: string): void {
    const cssPageId = pageId || this.options.pageId || 'default'
    const key = `data-te-page-${cssPageId}`

    if (!css) {
      this.removePageCss(key)
      return
    }

    // 尝试使用现代CSS API
    if (this.options.enableModernCSS && this.supportsConstructableStylesheets()) {
      this.setCSSWithConstructableStylesheet(key, css)
    } else {
      // 降级到传统方式
      this.setCSSWithFallback(key, css)
    }
  }

  /**
   * 检查是否支持Constructable Stylesheets
   */
  private supportsConstructableStylesheets(): boolean {
    return typeof CSSStyleSheet !== 'undefined' && typeof document.adoptedStyleSheets !== 'undefined'
  }

  /**
   * 使用现代CSS API设置样式
   */
  private setCSSWithConstructableStylesheet(key: string, css: string): void {
    try {
      let styleSheet = this.styleSheetMap.get(key)

      if (!styleSheet) {
        styleSheet = new CSSStyleSheet()
        this.styleSheetMap.set(key, styleSheet)

        // 添加到document的adoptedStyleSheets
        const currentSheets = Array.from(document.adoptedStyleSheets)
        if (!currentSheets.includes(styleSheet)) {
          document.adoptedStyleSheets = [...currentSheets, styleSheet]
        }
      }

      // 处理作用域CSS
      const processedCSS = this.options.enableScoped ? this.processScopedCSS(key, css) : css

      styleSheet.replaceSync(processedCSS)

      // 清理fallback样式
      this.removeFallbackStyle(key)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Constructable Stylesheets failed, falling back to traditional method:', error)
      this.setCSSWithFallback(key, css)
    }
  }

  /**
   * 使用传统方式设置样式
   */
  private setCSSWithFallback(key: string, css: string): void {
    let styleElement = this.fallbackStyleMap.get(key)

    if (!styleElement) {
      styleElement = document.createElement('style')
      styleElement.setAttribute('type', 'text/css')
      styleElement.setAttribute('data-te-page', key)
      document.head?.appendChild(styleElement)
      this.fallbackStyleMap.set(key, styleElement)
    }

    // 处理作用域CSS
    const processedCSS = this.options.enableScoped ? this.processScopedCSS(key, css) : css

    styleElement.textContent = processedCSS
  }

  /**
   * 处理作用域CSS
   * 简化版的作用域处理，将CSS选择器添加页面作用域
   */
  private processScopedCSS(key: string, css: string): string {
    if (!this.options.enableScoped) {
      return css
    }

    // 简单的CSS作用域处理
    // 将 body, html 等全局选择器转换为作用域选择器
    return css
      .replace(/body\s*{/g, `body[${key}] {`)
      .replace(/html\s*{/g, `html[${key}] {`)
      .replace(/\*:global\(([^)]+)\)/g, '$1') // 处理:global()语法
      .replace(/:global\(([^)]+)\)/g, '$1') // 处理:global()语法
  }

  /**
   * 移除页面CSS
   */
  removePageCss(key: string): void {
    // 移除现代CSS
    const styleSheet = this.styleSheetMap.get(key)
    if (styleSheet) {
      const currentSheets = Array.from(document.adoptedStyleSheets)
      document.adoptedStyleSheets = currentSheets.filter((sheet) => sheet !== styleSheet)
      this.styleSheetMap.delete(key)
    }

    // 移除fallback样式
    this.removeFallbackStyle(key)
  }

  /**
   * 移除fallback样式元素
   */
  private removeFallbackStyle(key: string): void {
    const styleElement = this.fallbackStyleMap.get(key)
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement)
      this.fallbackStyleMap.delete(key)
    }
  }

  /**
   * 清理所有样式
   */
  clearAllStyles(): void {
    // 清理现代CSS
    this.styleSheetMap.forEach((_, key) => {
      this.removePageCss(key)
    })

    // 清理fallback样式
    this.fallbackStyleMap.forEach((_, key) => {
      this.removeFallbackStyle(key)
    })
  }

  /**
   * 获取样式统计信息
   */
  getStats(): { modernCSS: number; fallbackCSS: number; total: number } {
    return {
      modernCSS: this.styleSheetMap.size,
      fallbackCSS: this.fallbackStyleMap.size,
      total: this.styleSheetMap.size + this.fallbackStyleMap.size
    }
  }
}

// 创建全局CSS处理器实例
let globalCSSHandler: EnhancedCSSHandler | null = null

/**
 * 获取全局CSS处理器
 */
export function getCSSHandler(options?: CSSHandlerOptions): EnhancedCSSHandler {
  if (!globalCSSHandler) {
    globalCSSHandler = new EnhancedCSSHandler(options)
  }
  return globalCSSHandler
}

/**
 * 设置页面CSS（兼容原有API）
 */
export function setPageCss(css: string = '', pageId?: string): void {
  const handler = getCSSHandler({ pageId })
  handler.setPageCss(css, pageId)
}

/**
 * 清理所有CSS（用于页面切换）
 */
export function clearAllPageCSS(): void {
  if (globalCSSHandler) {
    globalCSSHandler.clearAllStyles()
  }
}

export default EnhancedCSSHandler
