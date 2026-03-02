<script lang="ts" setup>
import type { ExportedItem } from '@/types/item'
import { performAutoIcon, performUpload } from '@/utils/actions'
import { getContainer } from '@/utils/container'
import { getCssExportSettings, getSvgAutoCurrentColor } from '@/utils/storage'
import { Message } from '@arco-design/web-vue'
import saveAs from 'file-saver'
import { computed, ref, watch } from 'vue'
import { serializeCSS } from '@/utils/css'
import { css2uno } from '@/utils/unocss'




interface Props {
  exportedItems: ExportedItem[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const visible = defineModel<boolean>('visible')

// 导出格式类型
type ExportFormat = 'SVG' | 'WEBP' | 'CSS' | 'UNOCSS'

// 当前选中的导出格式
const selectedFormat = ref<ExportFormat>('SVG')

// 上传和auto icon状态
const uploadingItems = ref<Set<string>>(new Set())
const autoIconingItems = ref<Set<string>>(new Set())
const cssSettings = ref({
  useRem: true,
  rootFontSize: 16,
})

const itemColorSettings = ref<Record<string, { isMono: boolean, rawColor: string, originalColor: string, previewColor: string }>>({})

function extractSvgColors(svg: string): string[] {
  const regex = /(?:fill|stroke)="([^"]+)"/gi
  let match
  const set = new Set<string>()
  while ((match = regex.exec(svg)) !== null) {
    const c = match[1].toLowerCase()
    if (c !== 'none' && c !== 'currentcolor' && c !== 'transparent' && c !== 'inherit') {
      set.add(c)
    }
  }
  return Array.from(set)
}

// 将任意 CSS 颜色标准化为 #rrggbb 7位十六进制格式
function normalizeToHex(color: string): string {
  const ctx = document.createElement('canvas').getContext('2d')!
  ctx.fillStyle = color
  return ctx.fillStyle // 浏览器会自动转为 #rrggbb 格式
}

async function processItems() {
  const autoColor = await getSvgAutoCurrentColor()

  const newMap: Record<string, { isMono: boolean, rawColor: string, originalColor: string, previewColor: string }> = {}
  props.exportedItems.forEach((item) => {
    if (item.svgString) {
      const colors = extractSvgColors(item.svgString)
      // If the SVG has exactly one unique color and the auto setting is on
      if (colors.length === 1 && autoColor) {
        const hexColor = normalizeToHex(colors[0])
        newMap[item.name] = {
          isMono: true,
          rawColor: colors[0], // 保存 SVG 中的原始颜色字符串，用于正则替换
          originalColor: hexColor, // hex 格式，用于颜色选择器和重置
          previewColor: hexColor,
        }
      }
    }
  })
  itemColorSettings.value = newMap
}

watch(() => props.exportedItems, () => {
  processItems()
}, { immediate: true })

watch(visible, async (newVal) => {
  if (newVal) {
    processItems() // Re-process when modal opens just in case storage changed
    cssSettings.value = await getCssExportSettings()
  }
})

function getFinalSvgString(item: ExportedItem): string {
  const setting = itemColorSettings.value[item.name]
  let finalSvgString = item.svgString
  if (!finalSvgString)
    return ''

  if (setting && setting.isMono) {
    // Escape originalColor for regex just in case
    const escapedColor = setting.rawColor.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    finalSvgString = finalSvgString.replace(new RegExp(`((?:fill|stroke)=")${escapedColor}(")`, 'gi'), `$1currentColor$2`)
  }
  return finalSvgString
}

const previewSvgUrls = computed(() => {
  const urls: Record<string, string> = {}
  props.exportedItems.forEach((item) => {
    const setting = itemColorSettings.value[item.name]
    if (setting && setting.isMono) {
      // 提前读取 previewColor 确保 Vue 追踪依赖
      const color = setting.previewColor
      const replaced = getFinalSvgString(item).replace(/(?:fill|stroke)="currentColor"/g, match => match.startsWith('stroke') ? `stroke="${color}"` : `fill="${color}"`)
      urls[item.name] = `data:image/svg+xml;utf8,${encodeURIComponent(replaced)}`
    }
    else if (item.svgString) {
      urls[item.name] = `data:image/svg+xml;utf8,${encodeURIComponent(item.svgString)}`
    }
    else {
      urls[item.name] = item.svgUrl || ''
    }
  })
  return urls
})

// 计算当前格式的导出项目
const currentFormatItems = computed(() => {
  return props.exportedItems.filter((item) => {
    switch (selectedFormat.value) {
      case 'SVG':
        return item.svgUrl || item.svgString
      case 'WEBP':
        return item.webpUrl
      case 'CSS':
        return item.css
      case 'UNOCSS':
        return item.css // UNOCSS 基于 CSS 生成
      default:
        return false
    }
  })
})

// 计算导出统计信息
const exportStats = computed(() => {
  const svgCount = props.exportedItems.filter(item => item.svgUrl || item.svgString).length
  const pngCount = props.exportedItems.filter(item => item.webpUrl).length
  const cssCount = props.exportedItems.filter(item => item.css).length
  return { svgCount, pngCount, cssCount }
})

// 切换导出格式
function switchFormat(format: ExportFormat) {
  selectedFormat.value = format
}

// 获取实际下载的SVG内容（如果修改了预览颜色则使用修改后的颜色）
function getDownloadedSvgContent(item: ExportedItem): string {
  const setting = itemColorSettings.value[item.name]
  let content = getFinalSvgString(item)
  if (setting && setting.isMono && setting.previewColor !== setting.originalColor) {
    content = content.replace(/(?:fill|stroke)="currentColor"/g, match => match.startsWith('stroke') ? `stroke="${setting.previewColor}"` : `fill="${setting.previewColor}"`)
  }
  return content
}

// 下载单个文件
async function downloadSingle(item: ExportedItem, format: ExportFormat) {
  if (format === 'SVG') {
    const content = getDownloadedSvgContent(item)
    if (!content) {
      return Message.error('SVG内容为空')
    }
    saveAs(new Blob([content], { type: 'image/svg+xml' }), `${item.name}.svg`)
  }
  else if (format === 'WEBP') {
    if (!item.webpUrl) {
      return Message.error('WEBP内容为空')
    }
    const content = await fetch(item.webpUrl).then(res => res.blob())
    saveAs(content, `${item.name}.webp`)
  }
}

async function copySvgCode(item: ExportedItem) {
  const content = getDownloadedSvgContent(item)
  if (!content) {
    return Message.error('SVG代码为空')
  }
  await navigator.clipboard.writeText(content)
  Message.success('SVG代码已复制')
}

async function copySvgUrl(item: ExportedItem) {
  const setting = itemColorSettings.value[item.name]
  if (setting && setting.isMono) {
    const url = `data:image/svg+xml;utf8,${encodeURIComponent(getDownloadedSvgContent(item))}`
    await navigator.clipboard.writeText(url)
    Message.success('已复制修改后的SVG链接')
    return
  }

  if (!item.svgUrl) {
    return Message.error('SVG链接为空')
  }
  await navigator.clipboard.writeText(item.svgUrl)
  Message.success('SVG链接已复制')
}

function getItemCss(item: ExportedItem): string {
  if (!item.css)
    return ''
  if (typeof item.css === 'string')
    return item.css
  return serializeCSS(item.css, {
    ...cssSettings.value,
    scale: 1,
  })
}

async function copyCss(item: ExportedItem) {
  const css = getItemCss(item)
  if (!css) {
    return Message.error('CSS内容为空')
  }
  await navigator.clipboard.writeText(css)
  Message.success('CSS内容已复制')
}

async function copyUnocss(item: ExportedItem) {
  const css = getItemCss(item)
  if (!css) {
    return Message.error('UNOCSS内容为空')
  }
  await navigator.clipboard.writeText(css2uno(css))
  Message.success('UNOCSS内容已复制')
}

// 上传单个项目
async function handleUpload(item: ExportedItem, index: number) {
  const itemKey = `${selectedFormat.value}-${index}`
  if (uploadingItems.value.has(itemKey))
    return

  try {
    uploadingItems.value.add(itemKey)
    await performUpload(item)
  }
  catch (error) {
    logger.error('上传过程中发生错误', error)
    Message.error(error instanceof Error? error.message: '上传过程中发生错误')
  }
  finally {
    uploadingItems.value.delete(itemKey)
  }
}


// 处理单个项目的auto icon
async function handleAutoIcon(item: ExportedItem, index: number) {
  const itemKey = `${selectedFormat.value}-${index}`
  if (autoIconingItems.value.has(itemKey))
    return

  try {
    autoIconingItems.value.add(itemKey)
    const content = getFinalSvgString(item)
    await performAutoIcon(item, content)
  }
  catch (error) {
    logger.error('Auto icon过程中发生错误', error)
    Message.error(error instanceof Error? error.message: 'Auto icon过程中发生错误')
  }
  finally {
    autoIconingItems.value.delete(itemKey)
  }
}


const containerRef = ref<HTMLElement>()

watch(
  visible,
  (newVal) => {
    if (newVal) {
      containerRef.value = getContainer()
    }
  },
)
</script>

<template>
  <a-modal
    v-model:visible="visible"
    draggable
    :popup-container="containerRef"
    :title="`导出结果 (${exportedItems.length} 个项目)`"
    width="900px"
    :footer="false"
  >
    <div class="export-modal">
      <!-- 格式切换 -->
      <div class="format-selector">
        <div class="format-tabs">
          <a-button
            :type="selectedFormat === 'SVG' ? 'primary' : 'outline'"
            size="small"
            @click="switchFormat('SVG')"
          >
            SVG ({{ exportStats.svgCount }})
          </a-button>
          <a-button
            :type="selectedFormat === 'WEBP' ? 'primary' : 'outline'"
            size="small"
            @click="switchFormat('WEBP')"
          >
            WEBP ({{ exportStats.pngCount }})
          </a-button>
          <a-button
            :type="selectedFormat === 'CSS' ? 'primary' : 'outline'"
            size="small"
            @click="switchFormat('CSS')"
          >
            CSS ({{ exportStats.cssCount }})
          </a-button>
          <a-button
            :type="selectedFormat === 'UNOCSS' ? 'primary' : 'outline'"
            size="small"
            @click="switchFormat('UNOCSS')"
          >
            UNOCSS ({{ exportStats.cssCount }})
          </a-button>
        </div>
      </div>

      <!-- 导出项目列表 -->
      <div class="items-list">
        <template v-if="currentFormatItems.length > 0">
          <a-card
            v-for="(item, index) in currentFormatItems"
            :key="`${selectedFormat}-${index}`"
            class="item-card"
            size="small"
          >
            <template #title>
              <div class="item-header">
                <span class="item-name">{{ item.name }}</span>
                <a-tag size="small" color="blue">
                  {{ selectedFormat }}
                </a-tag>
              </div>
            </template>

            <div class="item-content">
              <!-- SVG 预览 -->
              <div v-if="selectedFormat === 'SVG' && (item.svgUrl || item.svgString)" class="svg-preview-container flex flex-col gap-2">
                <div class="image-preview relative">
                  <img
                    :src="previewSvgUrls[item.name]"
                    alt="SVG Preview"
                    class="png-image h-full w-full"
                  >
                  <div v-if="itemColorSettings[item.name]?.isMono" class="color-picker-overlay p-2 rounded bg-white/80 flex gap-2 shadow items-center right-2 top-2 absolute">
                    <span class="text-xs text-gray-600">currentColor:</span>
                    <input v-model="itemColorSettings[item.name].previewColor" type="color" class="p-0 border-0 rounded h-6 w-6 cursor-pointer">
                    <a-button size="mini" @click="itemColorSettings[item.name].previewColor = itemColorSettings[item.name].originalColor">
                      重置
                    </a-button>
                  </div>
                </div>
              </div>

              <!-- PNG 预览 -->
              <div v-else-if="selectedFormat === 'WEBP' && item.webpUrl" class="image-preview">
                <img
                  :src="item.webpUrl"
                  alt="PNG Preview"
                  class="png-image h-full w-full"
                >
              </div>

              <!-- CSS 代码显示 -->
              <div v-else-if="selectedFormat === 'CSS' && item.css" class="css-preview">
                <pre class="css-code">{{ getItemCss(item) }}</pre>
              </div>

              <!-- UNOCSS 代码显示 -->
              <div v-else-if="selectedFormat === 'UNOCSS' && item.css" class="css-preview">
                <pre class="css-code">{{ css2uno(getItemCss(item)) }}</pre>
              </div>
            </div>

            <template #actions>
              <a-button
                v-if="selectedFormat === 'SVG'"
                type="outline"
                size="mini"
                @click="copySvgCode(item)"
              >
                复制 SVG 代码
              </a-button>
              <a-button
                v-if="selectedFormat === 'SVG'"
                type="outline"
                size="mini"
                @click="copySvgUrl(item)"
              >
                复制 SVG 图片链接
              </a-button>
              <a-button
                v-if="selectedFormat === 'CSS'"
                type="outline"
                size="mini"
                @click="copyCss(item)"
              >
                复制 CSS
              </a-button>
              <a-button
                v-if="selectedFormat === 'UNOCSS'"
                type="outline"
                size="mini"
                @click="copyUnocss(item)"
              >
                复制 UNOCSS
              </a-button>
              <a-button
                v-if="selectedFormat === 'SVG'"
                type="outline"
                size="mini"
                :loading="autoIconingItems.has(`${selectedFormat}-${index}`)"
                @click="handleAutoIcon(item, index)"
              >
                AUTO ICON
              </a-button>
              <a-button
                v-if="selectedFormat === 'WEBP'"
                type="outline"
                size="mini"
                :loading="uploadingItems.has(`${selectedFormat}-${index}`)"
                @click="handleUpload(item, index)"
              >
                <template #icon>
                  <div class="mdi:cloud-upload text-sm" />
                </template>
                上传
              </a-button>

              <a-button
                v-if="selectedFormat !== 'CSS' && selectedFormat !== 'UNOCSS'"
                type="primary"
                size="mini"
                @click="downloadSingle(item, selectedFormat)"
              >
                下载
              </a-button>
            </template>
          </a-card>
        </template>

        <div v-else class="empty-state">
          <p>没有{{ selectedFormat }}格式的导出内容</p>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style scoped lang="scss">
.export-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.format-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--color-fill-1);
  border-radius: 6px;
}

.format-tabs {
  display: flex;
  gap: 8px;
}

.items-list {
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item-card {
  transition: all 0.2s ease;
}

.item-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-name {
  font-weight: 500;
  color: var(--color-text-1);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-content {
  margin: 12px 0;
}

.image-preview {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  background-image: url('data:image/svg+xml;utf8,%3Csvg%20width%3D%226%22%20height%3D%226%22%20viewBox%3D%220%200%206%206%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M0%200H3V3H0V0Z%22%20fill%3D%22%23E1E1E1%22/%3E%3Cpath%20d%3D%22M3%200H6V3H3V0Z%22%20fill%3D%22white%22/%3E%3Cpath%20d%3D%22M3%203H6V6H3V3Z%22%20fill%3D%22%23E1E1E1%22/%3E%3Cpath%20d%3D%22M0%203H3V6H0V3Z%22%20fill%3D%22white%22/%3E%3C/svg%3E%0A');
  background-repeat: repeat;
  border-radius: 4px;
  padding: 8px;
}

.png-image {
  object-fit: contain;
  border-radius: 4px;
}

.css-preview {
  background: var(--color-fill-1);
  border-radius: 4px;
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.css-code {
  margin: 0;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-text-1);
  white-space: pre-wrap;
  word-break: break-all;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--color-text-3);
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}
</style>
