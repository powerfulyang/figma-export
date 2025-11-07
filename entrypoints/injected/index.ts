import type { ExportedItem } from '@/types/item'
import type { SelectionInfo } from '@/types/selection'
import type { CssExportSettings } from '@/types/settings'
import decodePng, { init as initPngDecode } from '@jsquash/png/decode'
import encodeWebp, { init as initWebpEncode } from '@jsquash/webp/encode'
import { encode } from 'js-base64'
import pWaitFor from 'p-wait-for'
import { onMessage, sendMessage, setNamespace } from 'webext-bridge/window'
import { listenSelectionChange } from '@/fimga'
import { debugLog, errorLog } from '@/utils/constants'
import { serializeCSS } from '@/utils/css'
import { handleSvg } from '@/utils/svg'

export default defineUnlistedScript(async () => {
  setNamespace(SERVICE)

  await pWaitFor(() => !!window.figma_for_ui_content)

  debugLog('figma_for_ui_content is ready', window.figma_for_ui_content)
  const figma = window.figma_for_ui_content

  sendMessage('figma-is-ready', true, 'content-script')

  async function getCssSettings() {
    const result = await sendMessage('get-css-settings', null, 'content-script') as unknown as CssExportSettings
    debugLog('getCssSettings', result)
    return {
      useRem: result.useRem,
      rootFontSize: result.rootFontSize,
    }
  }

  async function getSelectionInfo(): Promise<SelectionInfo> {
    const { selection } = figma.currentPage
    if (selection.length !== 1) {
      return {
        count: selection.length,
      }
    }

    const node = selection[0]
    const cssSettings = await getCssSettings()
    const css = serializeCSS(await node.getCSSAsync(), {
      useRem: cssSettings.useRem,
      rootFontSize: cssSettings.rootFontSize,
      scale: 1,
    })

    return {
      count: 1,
      name: node.name,
      css,
    }
  }

  async function emitSelectionInfo() {
    debugLog('emitSelectionInfo')
    const info = await getSelectionInfo()
    await sendMessage('selection-info', JSON.parse(JSON.stringify(info)), 'content-script')
  }

  async function handleExport(scale: number) {
    const { selection } = figma.currentPage
    const result = []
    const cssSettings = await getCssSettings()
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
            value: scale, // 3x 缩放以获得高质量PNG
          },
        })
        // 使用jsquash将PNG压缩为WebP格式
        const file = new File([pngBytes.buffer as ArrayBuffer], `${node.name}.png`, { type: 'image/png' })
        await initPngDecode('https://help.littleeleven.com/squoosh_png_bg.wasm')
        const imageData = await decodePng(await file.arrayBuffer())
        // @ts-expect-error
        await initWebpEncode(null, {
          // Customise the path to load the wasm file
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
        item.css = serializeCSS(await node.getCSSAsync(), {
          toJS: false,
          useRem: cssSettings.useRem,
          rootFontSize: cssSettings.rootFontSize,
          scale: 1,
        })
        result.push(item)
      }
    }
    catch (error) {
      errorLog('导出过程中发生错误', error)
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
