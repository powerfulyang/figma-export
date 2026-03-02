<script lang="ts" setup>
import type { CSSProperties } from 'vue'
import type { SelectionInfo } from '@/types/selection'
import type { SelectionPanelPosition, UploadConfig } from '@/types/settings'
import { onMessage } from 'webext-bridge/content-script'
import { logger } from '@/utils/constants'
import { getCssExportSettings, getSelectionPanelPosition, setSelectionPanelPosition } from '@/utils/storage'
import { serializeCSS } from '@/utils/css'
import { css2uno } from '@/utils/unocss'
import type { CssExportSettings } from '@/types/settings'
import { DEFAULT_CSS_SETTINGS } from '@/utils/storage'

defineOptions({
  name: 'SelectionPanel',
})

const selectionInfo = ref<SelectionInfo>({
  count: 0,
})
const resolvedPosition = ref<SelectionPanelPosition>({
  x: 0,
  y: 0,
})
const panelRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragStartPoint = ref({ x: 0, y: 0 })
const dragOrigin = ref<SelectionPanelPosition>({ x: 0, y: 0 })
const copiedSection = ref<'css' | 'uno' | null>(null)
let copyTimer: ReturnType<typeof setTimeout> | null = null
let dragPointerId: number | null = null

const selectionName = computed(() => selectionInfo.value.name ?? '当前选中')
const selectionCss = ref('')
const loading = ref(false)

watchEffect(async () => {
  const css = selectionInfo.value.css
  if (!css) {
    selectionCss.value = ''
    return
  }
  loading.value = true
  try {
    const settings = await getCssExportSettings()
    selectionCss.value = serializeCSS(css, {
      ...settings,
      scale: 1,
    })
  }
  finally {
    loading.value = false
  }
})
const selectionUno = computed(() => {
  const css = selectionCss.value.trim()
  if (!css) {
    return ''
  }
  try {
    return css2uno(css)
  }
  catch (error) {
    logger.error('转换 UnoCSS 失败', error)
    return ''
  }
})
const canCopyCss = computed(() => Boolean(selectionCss.value.trim()))
const canCopyUno = computed(() => Boolean(selectionUno.value.trim()))
const panelStyle = computed<CSSProperties>(() => ({
  top: `${resolvedPosition.value.y}px`,
  left: `${resolvedPosition.value.x}px`,
}))

function getPanelMetrics() {
  const width = panelRef.value?.offsetWidth || 220
  const height = panelRef.value?.offsetHeight || 260
  return { width, height }
}

function clampPosition(position: SelectionPanelPosition): SelectionPanelPosition {
  const { width, height } = getPanelMetrics()
  const padding = 12
  const maxX = Math.max(padding, window.innerWidth - width - padding)
  const maxY = Math.max(padding, window.innerHeight - height - padding)
  return {
    x: Math.min(Math.max(padding, position.x), maxX),
    y: Math.min(Math.max(padding, position.y), maxY),
  }
}

function getDefaultPosition(): SelectionPanelPosition {
  const { width, height } = getPanelMetrics()
  return clampPosition({
    x: window.innerWidth - width,
    y: window.innerHeight - height - 120,
  })
}

async function initPosition() {
  await nextTick()
  const stored = await getSelectionPanelPosition()
  const base = stored ?? getDefaultPosition()
  resolvedPosition.value = clampPosition(base)
}

async function persistPosition(position: SelectionPanelPosition) {
  try {
    await setSelectionPanelPosition(position)
  }
  catch (error) {
    logger.error('保存浮窗位置失败', error)
  }
}

function handlePointerDown(event: PointerEvent) {
  if (event.button !== 0) {
    return
  }
  isDragging.value = true
  dragPointerId = event.pointerId
  dragStartPoint.value = {
    x: event.clientX,
    y: event.clientY,
  }
  dragOrigin.value = { ...resolvedPosition.value }
  ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
  event.preventDefault()
}

function handlePointerMove(event: PointerEvent) {
  if (!isDragging.value) {
    return
  }
  const deltaX = event.clientX - dragStartPoint.value.x
  const deltaY = event.clientY - dragStartPoint.value.y
  resolvedPosition.value = clampPosition({
    x: dragOrigin.value.x + deltaX,
    y: dragOrigin.value.y + deltaY,
  })
}

function cancelDragging(event: PointerEvent) {
  if (!isDragging.value) {
    return
  }
  if (dragPointerId !== null) {
    ;(event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(dragPointerId)
    dragPointerId = null
  }
  isDragging.value = false
}

function handlePointerUp(event: PointerEvent) {
  if (!isDragging.value) {
    return
  }
  cancelDragging(event)
  void persistPosition(resolvedPosition.value)
}

async function copyContent(type: 'css' | 'uno') {
  const text = type === 'css' ? selectionCss.value : selectionUno.value
  const normalized = text.trim()
  if (!normalized) {
    return
  }
  try {
    await navigator.clipboard.writeText(normalized)
    copiedSection.value = type
    if (copyTimer) {
      clearTimeout(copyTimer)
    }
    copyTimer = window.setTimeout(() => {
      copiedSection.value = null
      copyTimer = null
    }, 1500)
  }
  catch (error) {
    logger.error('复制内容失败', error)
  }
}

const stopSelectionMessage = onMessage('selection-info', (message) => {
  const data = message.data as unknown as SelectionInfo
  logger.log('receive selectionInfo', data)
  if (data.count > 0) {
    selectionInfo.value = data
  }
})

function handleResize() {
  resolvedPosition.value = clampPosition(resolvedPosition.value)
}


onMounted(() => {
  void initPosition()
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize)
  }
})

onBeforeUnmount(() => {
  stopSelectionMessage()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize)
  }
  if (copyTimer) {
    clearTimeout(copyTimer)
  }
})
</script>

<template>
  <div
    v-if="selectionInfo.count > 0"
    ref="panelRef"
    class="selection-floating"
    :class="{ 'is-dragging': isDragging }"
    :style="panelStyle"
  >
    <div
      class="selection-floating__header"
      :class="{ 'is-dragging': isDragging }"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="cancelDragging"
    >
      <div class="selection-floating__title">
        {{ selectionName }}
      </div>
    </div>

    <div class="selection-floating__section">
      <div class="selection-floating__section-header">
        <div class="selection-floating__section-title">
          CSS
        </div>
        <button
          type="button"
          class="selection-floating__copy"
          :class="{ 'is-active': copiedSection === 'css' }"
          :disabled="!canCopyCss || loading"
          @click="copyContent('css')"
        >
          {{ copiedSection === 'css' ? '已复制' : '复制' }}
        </button>
      </div>
      <pre class="selection-floating__code" :class="{ 'is-loading': loading }">{{ loading ? '正在导出 CSS...' : (selectionCss || '当前节点不支持 CSS 导出') }}</pre>
    </div>

    <div class="selection-floating__section">
      <div class="selection-floating__section-header">
        <div class="selection-floating__section-title">
          UnoCSS
        </div>
        <button
          type="button"
          class="selection-floating__copy"
          :class="{ 'is-active': copiedSection === 'uno' }"
          :disabled="!canCopyUno || loading"
          @click="copyContent('uno')"
        >
          {{ copiedSection === 'uno' ? '已复制' : '复制' }}
        </button>
      </div>
      <pre class="selection-floating__code" :class="{ 'is-loading': loading }">{{ loading ? '正在计算 UnoCSS...' : (selectionUno || '无法转换为 UnoCSS') }}</pre>
    </div>
  </div>
</template>

<style scoped lang="scss">
.selection-floating {
  position: fixed;
  width: 220px;
  padding: 16px;
  border-radius: 16px;
  background: rgba(19, 19, 19, 0.92);
  color: #f4f4f5;
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease;
  cursor: default;
}

.selection-floating.is-dragging {
  cursor: grabbing;
  box-shadow: 0 16px 60px rgba(0, 0, 0, 0.55);
}

.selection-floating__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  cursor: grab;
  user-select: none;
}

.selection-floating__header.is-dragging {
  cursor: grabbing;
}

.selection-floating__title {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selection-floating__badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
}

.selection-floating__section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.selection-floating__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.selection-floating__section-title {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.7);
}

.selection-floating__copy {
  font-size: 11px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  padding: 2px 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.selection-floating__copy:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.selection-floating__copy:not(:disabled):hover {
  border-color: rgba(255, 255, 255, 0.55);
}

.selection-floating__copy.is-active {
  background: rgba(79, 192, 141, 0.3);
  border-color: rgba(79, 192, 141, 0.6);
  color: #e3fcec;
}

.selection-floating__code {
  margin: 0;
  padding: 12px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.35);
  max-height: 160px;
  overflow: auto;
  white-space: pre;
  font-size: 12px;
  line-height: 1.5;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.4) transparent;

  &.is-loading {
    opacity: 0.6;
    color: rgba(255, 255, 255, 0.6);
  }
}

.selection-floating__code::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.selection-floating__code::-webkit-scrollbar-track {
  background: transparent;
}

.selection-floating__code::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.35);
  border-radius: 999px;
}

.selection-floating__code::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.55);
}
</style>
