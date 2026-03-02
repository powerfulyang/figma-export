<script lang="ts" setup>
import type { FormDataUploadConfig, OssUploadConfig, UploadConfig } from '@/types/settings'
import {
  DEFAULT_CSS_SETTINGS,
  getUploadConfig,
  onUploadConfigChange,
  resetSelectionPanelPosition,
  setUploadConfig
} from '@/utils/storage'
import { Message } from '@arco-design/web-vue'
import '@arco-design/web-vue/es/message/style/index.css'
import 'virtual:uno.css'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const config = ref<UploadConfig>({ ...DEFAULT_UPLOAD_CONFIG })
const loading = ref(false)
const panelPosition = computed({
  get: () => config.value.selectionPanelPosition ?? null,
  set: (val) => {
    if (val) {
      config.value.selectionPanelPosition = val
    }
    else {
      delete config.value.selectionPanelPosition
    }
  },
})


const scale = computed({
  get: () => config.value.exportScale,
  set: (val) => { config.value.exportScale = val },
})

const autoIconApiUrl = computed({
  get: () => config.value.autoIconApiUrl,
  set: (val) => { config.value.autoIconApiUrl = val },
})

const svgAutoCurrentColor = computed({
  get: () => config.value.svgAutoCurrentColor,
  set: (val) => { config.value.svgAutoCurrentColor = val },
})

const useRemUnits = computed({
  get: () => config.value.cssExportSettings.useRem,
  set: (val) => { config.value.cssExportSettings.useRem = val },
})

const rootFontSize = computed({
  get: () => config.value.cssExportSettings.rootFontSize,
  set: (val) => { config.value.cssExportSettings.rootFontSize = val },
})

const uploadMode = computed({
  get: () => config.value.mode,
  set: (val) => {
    const base = {
      exportScale: config.value.exportScale,
      autoIconApiUrl: config.value.autoIconApiUrl,
      svgAutoCurrentColor: config.value.svgAutoCurrentColor,
      cssExportSettings: { ...config.value.cssExportSettings },
      selectionPanelPosition: config.value.selectionPanelPosition,
    }
    if (val === 'formdata') {
      config.value = {
        ...base,
        mode: 'formdata',
        url: (config.value as any).url || '',
        fileFieldName: (config.value as any).fileFieldName || 'file',
        extraFields: (config.value as any).extraFields || {},
        responseUrlPath: (config.value as any).responseUrlPath || 'data.url',
      }
    }
    else {
      config.value = {
        ...base,
        mode: 'oss',
        endpoint: (config.value as any).endpoint || '',
        bucket: (config.value as any).bucket || '',
        accessKeyId: (config.value as any).accessKeyId || '',
        accessKeySecret: (config.value as any).accessKeySecret || '',
        directory: (config.value as any).directory || '',
        customDomain: (config.value as any).customDomain || '',
      }
    }
  },
})

const fdUrl = computed({
  get: () => (config.value.mode === 'formdata' ? config.value.url : ''),
  set: (val) => {
    if (config.value.mode === 'formdata') {
      (config.value as FormDataUploadConfig).url = val
    }
  },
})

const fdFileFieldName = computed({
  get: () => (config.value.mode === 'formdata' ? config.value.fileFieldName : 'file'),
  set: (val) => {
    if (config.value.mode === 'formdata') {
      (config.value as FormDataUploadConfig).fileFieldName = val
    }
  },
})

const fdResponseUrlPath = computed({
  get: () => (config.value.mode === 'formdata' ? config.value.responseUrlPath : 'data.url'),
  set: (val) => {
    if (config.value.mode === 'formdata') {
      (config.value as FormDataUploadConfig).responseUrlPath = val
    }
  },
})

const fdExtraFieldsText = computed({
  get: () => serializeExtraFields(config.value.mode === 'formdata' ? (config.value.extraFields || {}) : {}),
  set: (val) => {
    if (config.value.mode === 'formdata') {
      (config.value as FormDataUploadConfig).extraFields = parseExtraFields(val)
    }
  },
})

const ossEndpoint = computed({
  get: () => (config.value.mode === 'oss' ? config.value.endpoint : ''),
  set: (val) => {
    if (config.value.mode === 'oss') {
      (config.value as OssUploadConfig).endpoint = val
    }
  },
})

const ossBucket = computed({
  get: () => (config.value.mode === 'oss' ? config.value.bucket : ''),
  set: (val) => {
    if (config.value.mode === 'oss') {
      (config.value as OssUploadConfig).bucket = val
    }
  },
})

const ossAccessKeyId = computed({
  get: () => (config.value.mode === 'oss' ? config.value.accessKeyId : ''),
  set: (val) => {
    if (config.value.mode === 'oss') {
      (config.value as OssUploadConfig).accessKeyId = val
    }
  },
})

const ossAccessKeySecret = computed({
  get: () => (config.value.mode === 'oss' ? config.value.accessKeySecret : ''),
  set: (val) => {
    if (config.value.mode === 'oss') {
      (config.value as OssUploadConfig).accessKeySecret = val
    }
  },
})

const ossDirectory = computed({
  get: () => (config.value.mode === 'oss' ? config.value.directory : ''),
  set: (val) => {
    if (config.value.mode === 'oss') {
      (config.value as OssUploadConfig).directory = val
    }
  },
})

const ossCustomDomain = computed({
  get: () => (config.value.mode === 'oss' ? config.value.customDomain : ''),
  set: (val) => {
    if (config.value.mode === 'oss') {
      (config.value as OssUploadConfig).customDomain = val
    }
  },
})


function parseExtraFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed)
      continue
    const sepIdx = trimmed.indexOf('=')
    if (sepIdx > 0) {
      fields[trimmed.slice(0, sepIdx).trim()] = trimmed.slice(sepIdx + 1).trim()
    }
  }
  return fields
}

function serializeExtraFields(fields: Record<string, string>): string {
  return Object.entries(fields).map(([k, v]) => `${k}=${v}`).join('\n')
}

onMounted(async () => {
  try {
    loading.value = true
    config.value = await getUploadConfig()

  }
  catch (error) {
    logger.error('Failed to load settings:', error)
    Message.error('加载设置失败')
  }
  finally {
    loading.value = false
  }
})

async function saveSettings() {
  try {
    loading.value = true

    // Normalize root font size
    config.value.cssExportSettings.rootFontSize = config.value.cssExportSettings.rootFontSize || DEFAULT_CSS_SETTINGS.rootFontSize

    await setUploadConfig(config.value)
    if (config.value.mode === 'formdata' && config.value.url) {
      await ensureHostPermission(config.value.url)
    }
    else if (config.value.mode === 'oss' && config.value.endpoint && config.value.bucket) {
      // Use virtual-host style URL: {bucket}.{endpoint}
      const endpoint = config.value.endpoint.startsWith('http') ? config.value.endpoint : `https://${config.value.endpoint}`
      const url = new URL(endpoint)
      const virtualHost = `${url.protocol}//${config.value.bucket}.${url.host}`
      await ensureHostPermission(virtualHost)
    }
    Message.success('设置已保存 ✨')
  }
  catch (error: any) {
    logger.error('Failed to save settings:', error)
    if (error && error.message && error.message.includes('访问权限')) {
      Message.error(error.message)
    }
    else {
      Message.error('保存设置失败 😞')
    }
  }
  finally {
    loading.value = false
  }
}


function extractOrigin(url: string): string {
  try {
    const u = new URL(url)
    return `${u.origin}/*`
  }
  catch {
    return url
  }
}

async function ensureHostPermission(url: string): Promise<void> {
  const origin = extractOrigin(url)
  const hasPermission = await browser.permissions.contains({ origins: [origin] })
  if (!hasPermission) {
    const granted = await browser.permissions.request({ origins: [origin] })
    if (!granted) {
      throw new Error(`无法获取对 ${origin} 的访问权限，无法保存配额，请授予权限。`)
    }
  }
}

const scalePresets = [
  { value: 3, label: '3x (超高清)' },
  { value: 4, label: '4x (极高清)' },
]





async function refreshPanelPosition() {
  try {
    config.value = await getUploadConfig()

    Message.success('浮窗位置已刷新')
  }
  catch (error) {
    logger.error('Failed to refresh panel position:', error)
    Message.error('刷新浮窗位置失败')
  }
}

async function handleResetPanelPosition() {
  try {
    await resetSelectionPanelPosition()
    config.value = await getUploadConfig()

    Message.success('浮窗位置已重置')
  }
  catch (error) {
    logger.error('Failed to reset panel position:', error)
    Message.error('重置浮窗位置失败')
  }
}

const panelPositionDisplay = computed(() => {
  if (!panelPosition.value) {
    return {
      x: '默认',
      y: '默认',
    }
  }
  return {
    x: `${Math.round(panelPosition.value.x)} px`,
    y: `${Math.round(panelPosition.value.y)} px`,
  }
})

onUploadConfigChange((newValue) => (config.value = newValue))

function openHistory() {
  browser.tabs.create({ url: browser.runtime.getURL('/options.html') })
}
</script>

<template>
  <div class="popup-container">
    <a-spin :loading="loading" tip="正在加载配置..." class="w-full">
      <a-card :bordered="false" class="main-card mb-8">

      <template #title>
        <div class="flex justify-between items-center w-full pr-4">
          <span class="text-base font-medium">🎨 Figma 导出设置</span>
          <a-button type="text" size="small" @click="openHistory">
            <template #icon><div class="mdi:history text-lg" /></template>
            历史记录
          </a-button>
        </div>
      </template>

      <a-form layout="vertical" size="small">
        <a-form-item label="导出缩放比例 (Scale)" tooltip="选择合适的缩放比例可以获得更好的导出质量">
          <div class="flex gap-2 w-full">
            <a-input-number v-model="scale" :min="1" :max="4" :step="1" placeholder="缩放比例" class="flex-1" />
            <a-radio-group v-model="scale" type="button">
              <a-radio v-for="preset in scalePresets" :key="preset.value" :value="preset.value">
                {{ preset.label }}
              </a-radio>
            </a-radio-group>
          </div>
        </a-form-item>

        <a-divider class="my-2" />

        <a-form-item label="CSS 导出单位" tooltip="影响 CSS/UnoCSS 显示的 rem 基准字号，常用 16px。">
          <div class="p-2 rounded bg-gray-50 flex gap-2 w-full items-center justify-between">
            <div class="flex gap-2 items-center">
              <a-switch v-model="useRemUnits" />
              <span class="text-xs text-gray-500">{{ useRemUnits ? 'rem (推荐)' : 'px' }}</span>
            </div>
            <div v-if="useRemUnits" class="flex gap-2 items-center">
              <span class="text-xs text-gray-500">根字号:</span>
              <a-input-number v-model="rootFontSize" :min="8" :max="64" :step="1" placeholder="Root font-size" style="width: 100px" />
            </div>
          </div>
        </a-form-item>

        <a-divider class="my-2" />

        <a-form-item label="SVG 单色自动换色" tooltip="如果 SVG 只有一个 fill 属性，是否自动将其替换为 currentColor">
          <a-switch v-model="svgAutoCurrentColor" />
          <span class="text-xs text-gray-500 ml-2">单色图标自动 currentColor</span>
        </a-form-item>

        <a-divider class="my-2" />

        <a-form-item label="自动图标 API 地址" tooltip="用于自动生成图标的 API 接口地址">
          <a-textarea v-model="autoIconApiUrl" placeholder="输入自动图标 API 地址" auto-size class="break-all" />
        </a-form-item>

        <a-divider class="my-2" />

        <a-form-item label="选区浮窗位置" tooltip="在 Figma 页面拖动浮窗后会自动记录，可在此刷新或重置。">
          <div class="flex gap-2 w-full items-center justify-between">
            <div class="flex gap-2 items-center">
              <a-tag color="gray">
                X: {{ panelPositionDisplay.x }}
              </a-tag>
              <a-tag color="gray">
                Y: {{ panelPositionDisplay.y }}
              </a-tag>
            </div>
            <div class="flex gap-2">
              <a-button size="mini" @click="refreshPanelPosition">
                刷新
              </a-button>
              <a-button size="mini" type="outline" @click="handleResetPanelPosition">
                重置
              </a-button>
            </div>
          </div>
        </a-form-item>

        <a-divider class="my-2" />

        <a-form-item label="上传配置" tooltip="配置导出文件的上传方式，支持 FormData 表单上传和 S3 兼容协议。">
          <a-tabs v-model:active-key="uploadMode" size="mini" class="w-full">
            <a-tab-pane key="formdata" title="FormData">
              <div class="mt-2 flex flex-col gap-2">
                <a-input v-model="fdUrl" placeholder="https://example.com/upload">
                  <template #prefix>
                    <span class="text-xs w-14">URL</span>
                  </template>
                </a-input>
                <a-input v-model="fdFileFieldName" placeholder="file">
                  <template #prefix>
                    <span class="text-xs w-14">字段名</span>
                  </template>
                </a-input>
                <a-input v-model="fdResponseUrlPath" placeholder="data.url">
                  <template #prefix>
                    <a-tooltip content="支持 lodash.get 语法从返回体中提取 URL，例如: data.url">
                      <span class="text-xs border-b border-gray-400 border-dashed w-14 cursor-help">响应路径</span>
                    </a-tooltip>
                  </template>
                </a-input>
                <a-textarea v-model="fdExtraFieldsText" placeholder="额外字段 key=value&#10;支持 {{filename}} {{filesize}} {{uuid}}" :auto-size="{ minRows: 2, maxRows: 4 }" />
              </div>
            </a-tab-pane>
            <a-tab-pane key="oss" title="OSS (S3)">
              <div class="mt-2 flex flex-col gap-2">
                <a-input v-model="ossEndpoint" placeholder="s3.us-east-1.amazonaws.com">
                  <template #prefix>
                    <span class="text-xs w-16">Endpoint</span>
                  </template>
                </a-input>
                <a-input v-model="ossBucket" placeholder="my-bucket">
                  <template #prefix>
                    <span class="text-xs w-16">Bucket</span>
                  </template>
                </a-input>
                <div class="flex gap-2">
                  <a-input v-model="ossAccessKeyId" placeholder="AccessKey ID" class="flex-1" />
                  <a-input-password v-model="ossAccessKeySecret" placeholder="••••••••" class="flex-1" />
                </div>
                <a-input v-model="ossDirectory" placeholder="目录前缀 (可选)" />
                <a-input v-model="ossCustomDomain" placeholder="自定义域名 (可选)" />
              </div>
            </a-tab-pane>
          </a-tabs>
        </a-form-item>

        <div class="px-4 py-2 flex items-center bottom-0 left-0 right-0 justify-between fixed backdrop-blur-sm">
          <div class="text-xs text-red-500 flex items-center">
            使用问题和建议请提 <a class="text-blue-500 ml-1" target="_blank" href="https://github.com/powerfulyang/figma-export/issues">issue</a>
          </div>
          <a-button type="primary" :loading="loading" @click="saveSettings">
            保存设置
          </a-button>
        </div>
      </a-form>
      </a-card>
    </a-spin>
  </div>
</template>

<style scoped>
.popup-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f7f8fa;
  min-height: 100vh;
  width: 400px;
}

.main-card {
  border-radius: 0;
  min-height: 100vh;
}

:deep(.arco-form-item-label-col) {
  margin-bottom: 4px;
}

:deep(.arco-form-item-label) {
  font-size: 13px;
  font-weight: 500;
  color: #1d2129;
}

:deep(.arco-divider-horizontal) {
  margin: 12px 0;
  border-bottom-color: #f2f3f5;
}
</style>
