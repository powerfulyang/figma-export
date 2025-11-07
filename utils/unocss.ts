import { toUnocssClass } from 'transform-to-unocss-core'

/**
 * 将 CSS 转换为 UNOCSS
 */
export function css2uno(css: string) {
  return toUnocssClass(css).join(' ')
}
