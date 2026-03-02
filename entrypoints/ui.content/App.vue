<script lang="ts" setup>
import type { ExportedItem } from '@/types/item'
import { performAutoIcon, performUpload } from '@/utils/actions'
import { logger } from '@/utils/constants'
import { getExportScale } from '@/utils/storage'
import { Message } from '@arco-design/web-vue'
import { onMessage, sendMessage } from 'webext-bridge/content-script'

import '@arco-design/web-vue/es/message/style/index.css'
import 'virtual:uno.css'

const exporting = ref(false)
const showModal = ref(false)
const exported = ref<ExportedItem[]>([])
const uploading = ref(false)


async function exportResult() {
  const scale = await getExportScale()
  const result = await sendMessage(
    'handleExport',
    scale,
    'window',
  )
  return result as unknown as ExportedItem[]
}

async function handleExport() {
  const el = Message.loading({
    content: '正在导出...',
    duration: 0,
  })
  try {
    exported.value = await exportResult()
    showModal.value = true
  }
  catch (error: any) {
    logger.error('导出过程中发生错误', error)
    Message.error(error?.message || '导出失败，请查看控制台获取更多信息。')
  }
  finally {
    el.close()
  }
}

async function handleUpload() {
  try {
    uploading.value = true
    const result = await exportResult()
    const pngItem = result.find(item => item.webpUrl)
    if (!pngItem) {
      return Message.error('没有找到可上传的 WEBP 项目')
    }
    await performUpload(pngItem)
  }
  catch (error: any) {
    logger.error('上传过程中发生错误', error)
    Message.error(error?.message || '上传失败，请查看控制台获取更多信息。')
  }
  finally {
    uploading.value = false
  }
}


function closeModal() {
  showModal.value = false
}

async function handleAutoIcon() {
  const el = Message.loading({
    content: '正在导出图标...',
    duration: 0,
  })
  try {
    const result = await exportResult()
    const svgItem = result.find(x => x.svgString)
    if (!svgItem?.svgString) {
      return Message.error('SVG内容为空')
    }
    await performAutoIcon(svgItem, svgItem.svgString)
  }
  catch (error: any) {
    logger.error('Auto icon过程中发生错误', error)
    Message.error(error?.message || '自动添加图标失败，请查看控制台获取更多信息。')
  }
  finally {
    el.close()
  }
}
</script>

<template>
  <selection-panel />

  <div class="export-ui">
    <!-- 导出格式选择 -->
    <div class="flex gap-2 items-center">
      <!-- 导出按钮 -->
      <a-button
        type="primary"
        :loading="exporting"
        @click="handleExport"
      >
        <template #icon>
          <div class="i-mdi:code-tags" />
        </template>
      </a-button>
      <!-- auto icon -->
      <a-button type="primary" @click="handleAutoIcon">
        <template #icon>
          <div class="i-mdi:svg" />
        </template>
      </a-button>
      <a-button
        type="primary"
        :loading="uploading"
        @click="handleUpload"
      >
        <template #icon>
          <div class="i-mdi:cloud-upload" />
        </template>
      </a-button>

      <!-- 导出结果弹窗 -->
      <export-modal
        v-model:visible="showModal"
        :exported-items="exported"
        @close="closeModal"
      />
    </div>
  </div>
</template>

<style scoped>
.export-ui {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 2147483646;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
