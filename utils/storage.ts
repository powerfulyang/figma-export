// Storage utilities for chrome extension
import type { CssExportSettings, SelectionPanelPosition, UploadConfig } from '@/types/settings'

const DEFAULT_SCALE = 3
const DEFAULT_AUTO_ICON_API_URL = ''
export const DEFAULT_CSS_SETTINGS: CssExportSettings = {
  useRem: true,
  rootFontSize: 16,
}

// ─── Unified Upload Config (single source of truth for all settings) ───

export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  mode: 'formdata',
  url: '',
  fileFieldName: 'file',
  extraFields: {},
  responseUrlPath: 'data.url',
  exportScale: DEFAULT_SCALE,
  autoIconApiUrl: DEFAULT_AUTO_ICON_API_URL,
  svgAutoCurrentColor: true,
  cssExportSettings: { ...DEFAULT_CSS_SETTINGS },
}

const cache = {
  uploadConfig: DEFAULT_UPLOAD_CONFIG,
}

export async function getUploadConfig(): Promise<UploadConfig> {
  try {
    if (cache.uploadConfig) {
      return cache.uploadConfig
    }
    const result = await browser.storage.sync.get<any>(['uploadConfig', 'selectionPanelPosition'])
    const config = result.uploadConfig ?? cache.uploadConfig
    if (result.selectionPanelPosition && !config.selectionPanelPosition) {
      config.selectionPanelPosition = result.selectionPanelPosition
    }
    cache.uploadConfig = config
    return config
  }
  catch (error) {
    console.warn('Failed to get upload config from storage, using default:', error)
    return { ...DEFAULT_UPLOAD_CONFIG }
  }
}

export async function setUploadConfig(config: UploadConfig): Promise<void> {
  try {
    await browser.storage.sync.set({ uploadConfig: config })
  }
  catch (error) {
    console.error('Failed to save upload config to storage:', error)
    throw error
  }
}

// ─── Convenience getters (read from uploadConfig) ───

export async function getExportScale(): Promise<number> {
  const config = await getUploadConfig()
  return config.exportScale ?? DEFAULT_SCALE
}

export async function getAutoIconApiUrl(): Promise<string> {
  const config = await getUploadConfig()
  return config.autoIconApiUrl ?? DEFAULT_AUTO_ICON_API_URL
}

export async function getSvgAutoCurrentColor(): Promise<boolean> {
  const config = await getUploadConfig()
  return config.svgAutoCurrentColor ?? false
}

export async function getCssExportSettings(): Promise<CssExportSettings> {
  const config = await getUploadConfig()
  return config.cssExportSettings ?? { ...DEFAULT_CSS_SETTINGS }
}

// ─── Selection Panel Position (convenience getters, read from uploadConfig) ───

export async function getSelectionPanelPosition(): Promise<SelectionPanelPosition | null> {
  const config = await getUploadConfig()
  if (config.selectionPanelPosition
    && typeof config.selectionPanelPosition.x === 'number'
    && typeof config.selectionPanelPosition.y === 'number') {
    return config.selectionPanelPosition
  }
  return null
}

export async function setSelectionPanelPosition(position: SelectionPanelPosition): Promise<void> {
  const config = await getUploadConfig()
  config.selectionPanelPosition = position
  await setUploadConfig(config)
}

export async function resetSelectionPanelPosition(): Promise<void> {
  const config = await getUploadConfig()
  delete config.selectionPanelPosition
  await setUploadConfig(config)
}

export async function checkUploadConfig() {
  const uploadConfig = await getUploadConfig()
  if (
    (uploadConfig.mode === 'formdata' && !uploadConfig.url)
    || (uploadConfig.mode === 'oss' && !uploadConfig.endpoint)
  ) {
    return false
  }
  return true
}
