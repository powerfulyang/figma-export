export interface ExportedItem {
  name: string
  svgString?: string
  svgUrl?: string
  webpUrl?: string
  pngBlob?: Blob
  width?: number
  height?: number
  css?: any
}
