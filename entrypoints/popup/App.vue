<script lang="ts" setup>
import type { FormDataUploadConfig, OssUploadConfig, SelectionPanelPosition, UploadConfig } from '@/types/settings'
import { Message } from '@arco-design/web-vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  DEFAULT_CSS_SETTINGS,
  getSelectionPanelPosition,
  getUploadConfig,
  resetSelectionPanelPosition,
  setUploadConfig,
} from '@/utils/storage'
import 'virtual:uno.css'
import '@arco-design/web-vue/es/message/style/index.css'

const scale = ref(3)
const autoIconApiUrl = ref('')
const loading = ref(false)
const useRemUnits = ref(true)
const rootFontSize = ref(DEFAULT_CSS_SETTINGS.rootFontSize)
const panelPosition = ref<SelectionPanelPosition | null>(null)
const positionLoading = ref(false)
const resettingPosition = ref(false)
const svgAutoCurrentColor = ref(false)

// Upload config state
const uploadMode = ref<'formdata' | 'oss'>('formdata')
// FormData config
const fdUrl = ref('')
const fdFileFieldName = ref('file')
const fdExtraFieldsText = ref('')
const fdResponseUrlPath = ref('data.url')
// OSS config
const ossEndpoint = ref('')
const ossBucket = ref('')
const ossAccessKeyId = ref('')
const ossAccessKeySecret = ref('')

const ossDirectory = ref('')
const ossCustomDomain = ref('')

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

function loadUploadConfigToState(config: UploadConfig) {
  // General settings
  scale.value = config.exportScale ?? 3
  autoIconApiUrl.value = config.autoIconApiUrl ?? ''
  svgAutoCurrentColor.value = config.svgAutoCurrentColor ?? false
  const css = config.cssExportSettings ?? DEFAULT_CSS_SETTINGS
  useRemUnits.value = css.useRem
  rootFontSize.value = css.rootFontSize

  // Upload settings
  uploadMode.value = config.mode
  if (config.mode === 'formdata') {
    fdUrl.value = config.url
    fdFileFieldName.value = config.fileFieldName || 'file'
    fdExtraFieldsText.value = serializeExtraFields(config.extraFields || {})
    fdResponseUrlPath.value = config.responseUrlPath || 'data.url'
  }
  else if (config.mode === 'oss') {
    ossEndpoint.value = config.endpoint
    ossBucket.value = config.bucket
    ossAccessKeyId.value = config.accessKeyId
    ossAccessKeySecret.value = config.accessKeySecret
    ossDirectory.value = config.directory
    ossCustomDomain.value = config.customDomain
  }
}

function buildUploadConfig(): UploadConfig {
  const normalizedRootFontSize = rootFontSize.value || DEFAULT_CSS_SETTINGS.rootFontSize
  rootFontSize.value = normalizedRootFontSize

  const baseSettings = {
    exportScale: scale.value,
    autoIconApiUrl: autoIconApiUrl.value,
    svgAutoCurrentColor: svgAutoCurrentColor.value,
    cssExportSettings: {
      useRem: useRemUnits.value,
      rootFontSize: normalizedRootFontSize,
    },
  }

  if (uploadMode.value === 'oss') {
    return {
      ...baseSettings,
      mode: 'oss',
      endpoint: ossEndpoint.value,
      bucket: ossBucket.value,
      accessKeyId: ossAccessKeyId.value,
      accessKeySecret: ossAccessKeySecret.value,
      directory: ossDirectory.value,
      customDomain: ossCustomDomain.value,
    } satisfies OssUploadConfig
  }
  return {
    ...baseSettings,
    mode: 'formdata',
    url: fdUrl.value,
    fileFieldName: fdFileFieldName.value || 'file',
    extraFields: parseExtraFields(fdExtraFieldsText.value),
    responseUrlPath: fdResponseUrlPath.value || 'data.url',
  } satisfies FormDataUploadConfig
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

onMounted(async () => {
  try {
    const uploadConfig = await getUploadConfig()
    loadUploadConfigToState(uploadConfig)
    panelPosition.value = await getSelectionPanelPosition()
  }
  catch (error) {
    console.error('Failed to load settings:', error)
    Message.error('加载设置失败')
  }
})


async function saveSettings() {
  try {
    loading.value = true

    const uploadConfig = buildUploadConfig()
    await setUploadConfig(uploadConfig)
    if (uploadConfig.mode === 'formdata' && uploadConfig.url) {
      await ensureHostPermission(uploadConfig.url)
    }
    else if (uploadConfig.mode === 'oss' && uploadConfig.endpoint) {
      // Use path-style URL, so we need permission for the endpoint origin directly
      const endpoint = uploadConfig.endpoint.startsWith('http') ? uploadConfig.endpoint : `https://${uploadConfig.endpoint}`
      await ensureHostPermission(endpoint)
    }
    Message.success('设置已保存 ✨')
  }
  catch (error: any) {
    console.error('Failed to save settings:', error)
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

async function refreshPanelPosition() {
  try {
    positionLoading.value = true
    panelPosition.value = await getSelectionPanelPosition()
    Message.success('浮窗位置已刷新')
  }
  catch (error) {
    console.error('Failed to refresh panel position:', error)
    Message.error('刷新浮窗位置失败')
  }
  finally {
    positionLoading.value = false
  }
}

async function handleResetPanelPosition() {
  try {
    resettingPosition.value = true
    await resetSelectionPanelPosition()
    panelPosition.value = null
    Message.success('浮窗位置已重置')
  }
  catch (error) {
    console.error('Failed to reset panel position:', error)
    Message.error('重置浮窗位置失败')
  }
  finally {
    resettingPosition.value = false
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

if (typeof browser !== 'undefined' && browser.storage?.onChanged) {
  const handleStorageChange: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, areaName) => {
    if (areaName !== 'sync') {
      return
    }
    if ('uploadConfig' in changes) {
      const newValue = changes.uploadConfig?.newValue as UploadConfig | undefined
      panelPosition.value = newValue?.selectionPanelPosition ?? null
    }
  }
  browser.storage.onChanged.addListener(handleStorageChange)
  onBeforeUnmount(() => {
    browser.storage.onChanged.removeListener(handleStorageChange)
  })
}
</script>

<template>
  <div class="popup-container">
    <a-card :bordered="false" class="main-card mb-8">
      <template #title>
        <span class="text-base font-medium">🎨 Figma 导出设置</span>
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
              <a-button size="mini" :loading="positionLoading" @click="refreshPanelPosition">
                刷新
              </a-button>
              <a-button size="mini" type="outline" :loading="resettingPosition" @click="handleResetPanelPosition">
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
