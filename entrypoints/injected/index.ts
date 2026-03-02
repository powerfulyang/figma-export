import type { ExportedItem } from '@/types/item'
import type { SelectionInfo } from '@/types/selection'
import decodePng, { init as initPngDecode } from '@jsquash/png/decode'
import encodeWebp, { init as initWebpEncode } from '@jsquash/webp/encode'
import { encode } from 'js-base64'
import pWaitFor from 'p-wait-for'
import { onMessage, sendMessage, setNamespace } from 'webext-bridge/window'
import { logger } from '@/utils/constants'
import { listenSelectionChange } from '@/utils/figma'
import { handleSvg } from '@/utils/svg'

export default defineUnlistedScript(async () => {
  setNamespace(SERVICE)

  await pWaitFor(() => !!window.figma_for_ui_content)

  logger.log('figma_for_ui_content is ready', window.figma_for_ui_content)
  const figma = window.figma_for_ui_content

  async function getSelectionInfo(): Promise<SelectionInfo> {
    const { selection } = figma.currentPage
    if (selection.length !== 1) {
      return {
        count: selection.length,
      }
    }

    const node = selection[0]
    const css = await node.getCSSAsync()

    return {
      count: 1,
      name: node.name,
      css,
    }
  }

  async function emitSelectionInfo() {
    logger.log('emitSelectionInfo')
    const info = await getSelectionInfo()
    await sendMessage('selection-info', JSON.parse(JSON.stringify(info)), 'content-script')
  }

  async function handleExport(scale: number) {
    const { selection } = figma.currentPage
    const result = []
    try {
      for (const node of selection) {
        const item: ExportedItem = {
          name: node.name,
        }

        const svgContent = await node.exportAsync({ format: 'SVG_STRING' })
        // 去除SVG中的width和height属性，使其更灵活
        const svgResult = handleSvg(svgContent)
        item.svgString = svgResult.svgContent
        item.svgUrl = `data:image/svg+xml;base64,${encode(item.svgString)}`
        item.width = svgResult.width
        item.height = svgResult.height

        // PNG导出需要指定约束条件
        const pngBytes = await node.exportAsync({
          format: 'PNG',
          constraint: {
            type: 'SCALE',
            value: scale,
          },
        })
        // 使用jsquash将PNG压缩为WebP格式
        const file = new File([pngBytes.buffer as ArrayBuffer], `${node.name}.png`, { type: 'image/png' })
        await initPngDecode('https://help.littleeleven.com/squoosh_png_bg.wasm')
        const imageData = await decodePng(await file.arrayBuffer())
        // @ts-expect-error
        await initWebpEncode(null, {
          locateFile: (path: string) => {
            return `https://help.littleeleven.com/${path}`
          },
        })
        const webpData = await encodeWebp(imageData, {
          quality: 80,
        })
        const blob = new Blob([webpData], { type: 'image/webp' })
        item.webpUrl = URL.createObjectURL(blob)

        // 获取样式
        item.css = await node.getCSSAsync()
        result.push(item)
      }
    }
    catch (error) {
      logger.error('导出过程中发生错误', error)
    }
    return result
  }

  onMessage('get-selection-info', async () => {
    return getSelectionInfo()
  })

  onMessage('handleExport', async (message) => {
    const scale = message.data as number
    return handleExport(scale)
  })

  await pWaitFor(() => !!figma?.currentPage?.selection)
  void emitSelectionInfo()
  listenSelectionChange(emitSelectionInfo)
})
