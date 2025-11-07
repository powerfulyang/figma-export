<script lang="ts" setup>
import type { ExportedItem } from '@/types/item'
import type { UploadConfig } from '@/types/settings'
import { Message } from '@arco-design/web-vue'
import { nanoid } from 'nanoid'
import { onMessage, sendMessage } from 'webext-bridge/content-script'
import { getAutoIconApiUrl, getCssExportSettings, getExportScale } from '@/utils/storage'
import { getCustomIcon } from '@/utils/svg'
import { uploadFile } from '@/utils/upload'
import '@arco-design/web-vue/es/message/style/index.css'
import 'virtual:uno.css'

const exporting = ref(false)
const showModal = ref(false)
const exported = ref<ExportedItem[]>([])
const uploading = ref(false)
const uploadProgress = ref(0)

if (typeof browser !== 'undefined' && browser.storage?.onChanged) {
  const handleStorageChange: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, areaName) => {
    if (areaName !== 'sync') {
      return
    }
    if (changes.uploadConfig) {
      setUploadConfig(changes.uploadConfig.newValue as UploadConfig)
    }
  }
  browser.storage.onChanged.addListener(handleStorageChange)
  onBeforeUnmount(() => {
    browser.storage.onChanged.removeListener(handleStorageChange)
  })
}

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
    errorLog('导出过程中发生错误', error)
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
    if (!pngItem?.webpUrl) {
      return Message.error('文件导出失败。')
    }
    const webpUrl = pngItem.webpUrl
    const fileName = pngItem.name
    const fileUrl = await uploadFile(
      webpUrl,
      `${fileName}.webp`,
      {
        onProgress: (progress) => {
          uploadProgress.value = Math.round(progress * 100)
        },
      },
    )
    // write to clipboard
    await navigator.clipboard.writeText(fileUrl)
    Message.success('成功上传文件，文件URL已复制到剪贴板')
  }
  catch (error: any) {
    errorLog('上传过程中发生错误', error)
    Message.error(error?.message || '上传失败，请查看控制台获取更多信息。')
  }
  finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

function closeModal() {
  showModal.value = false
}

async function handleAutoIcon() {
  const apiUrl = await getAutoIconApiUrl()
  if (!apiUrl) {
    Message.error('请先配置自动图标 API 地址')
    return
  }
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
    debugLog('svgItem', svgItem)
    const svgName = nanoid(6)
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: svgName,
        content: svgItem.svgString,
      }),
    })
    const json = await res.json()
    if (json.success) {
      await navigator.clipboard.writeText(getCustomIcon(svgName, svgItem))
      Message.success('图标添加成功')
    }
    else {
      Message.error(`图标添加失败，${json.message}`)
    }
  }
  catch (error: any) {
    errorLog('图标添加失败', error)
    Message.error(`图标添加失败，请重试。${error.message}`)
  }
  finally {
    el.close()
  }
}

const figmaIsReady = ref(false)
onMessage('figma-is-ready', () => {
  figmaIsReady.value = true
})
</script>

<template>
  <selection-panel />

  <div v-if="figmaIsReady" class="export-ui">
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
