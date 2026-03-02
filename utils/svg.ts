import type { ExportedItem } from '@/types/item'

export function handleSvg(svg: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svg, 'image/svg+xml')
  const svgElement = doc.documentElement
  const width = Number(svgElement.getAttribute('width')) || 0
  const height = Number(svgElement.getAttribute('height')) || 0
  svgElement.removeAttribute('width')
  svgElement.removeAttribute('height')
  return { svgElement, width, height, svgContent: svgElement.outerHTML }
}

export function getCustomIcon(name: string, item: ExportedItem) {
  return `<div class="${name} w-[${item.width}px] h-[${item.height}px]"></div>`
}
