// Storage utilities for chrome extension
import type { HistoryRecord } from '@/types/history'
import type { CssExportSettings, SelectionPanelPosition, UploadConfig } from '@/types/settings'
import { nanoid } from 'nanoid'
import { onBeforeUnmount } from 'vue'

const DEFAULT_SCALE = 3
const DEFAULT_AUTO_ICON_API_URL = ''
export const DEFAULT_CSS_SETTINGS: CssExportSettings = {
  useRem: true,
  rootFontSize: 16,
}

// ─── Unified Upload Config (single source of truth for all settings) ───

export const DEFAULT_UPLOAD_CONFIG = {
  mode: 'formdata',
  url: '',
  fileFieldName: 'file',
  extraFields: {},
  responseUrlPath: 'data.url',
  exportScale: DEFAULT_SCALE,
  autoIconApiUrl: DEFAULT_AUTO_ICON_API_URL,
  svgAutoCurrentColor: true,
  cssExportSettings: { ...DEFAULT_CSS_SETTINGS },
} as UploadConfig

const cache = {
  uploadConfig: undefined as UploadConfig | undefined,
}

if (typeof browser !== 'undefined' && browser.storage?.onChanged) {
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync' && changes.uploadConfig) {
      cache.uploadConfig = changes.uploadConfig.newValue as UploadConfig
    }
  })
}

export async function getUploadConfig(): Promise<UploadConfig> {
  try {
    if (cache.uploadConfig) {
      return cache.uploadConfig
    }
    const result = await browser.storage.sync.get<{ uploadConfig: UploadConfig }>('uploadConfig')
    const config = result.uploadConfig || DEFAULT_UPLOAD_CONFIG
    cache.uploadConfig = config
    return config
  }
  catch (error) {
    console.warn('Failed to get upload config from storage, using default:', error)
    return DEFAULT_UPLOAD_CONFIG
  }
}

export async function setUploadConfig(config: UploadConfig): Promise<void> {
  try {
    await browser.storage.sync.set({ uploadConfig: config })
    cache.uploadConfig = config
  }
  catch (error) {
    logger.error('Failed to save upload config to storage:', error)
    throw error
  }
}

// ─── Convenience getters (read from uploadConfig) ───

export async function getExportScale(): Promise<number> {
  const config = await getUploadConfig()
  return config.exportScale
}

export async function getAutoIconApiUrl(): Promise<string> {
  const config = await getUploadConfig()
  return config.autoIconApiUrl
}

export async function getSvgAutoCurrentColor(): Promise<boolean> {
  const config = await getUploadConfig()
  return config.svgAutoCurrentColor
}

export async function getCssExportSettings(): Promise<CssExportSettings> {
  const config = await getUploadConfig()
  return config.cssExportSettings
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

// ─── History Management (stored in storage.local) ───

export async function getHistory(): Promise<HistoryRecord[]> {
  try {
    const result = await browser.storage.local.get<{ history: HistoryRecord[] }>('history')
    return result.history || []
  }
  catch (error) {
    logger.error('Failed to get history from storage:', error)
    return []
  }
}

export async function addHistoryRecord(record: Omit<HistoryRecord, 'id' | 'timestamp'>): Promise<void> {
  try {
    const history = await getHistory()
    const newRecord: HistoryRecord = {
      ...record,
      id: nanoid(),
      timestamp: Date.now(),
    }
    // Keep only last 1000 records to avoid storage limits
    const updatedHistory = [newRecord, ...history].slice(0, 1000)
    await browser.storage.local.set({ history: updatedHistory })
  }
  catch (error) {
    logger.error('Failed to add history record:', error)
  }
}

export async function deleteHistoryRecord(id: string): Promise<void> {
  try {
    const history = await getHistory()
    const updatedHistory = history.filter(r => r.id !== id)
    await browser.storage.local.set({ history: updatedHistory })
  }
  catch (error) {
    logger.error('Failed to delete history record:', error)
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await browser.storage.local.set({ history: [] })
  }
  catch (error) {
    logger.error('Failed to clear history:', error)
  }
}

/**
 * Listen for uploadConfig changes and execute callback.
 * Must be called during component setup.
 */
export function onUploadConfigChange(callback: (config: UploadConfig) => void) {
  if (typeof browser !== 'undefined' && browser.storage?.onChanged) {
    const handleStorageChange: Parameters<typeof browser.storage.onChanged.addListener>[0] = (changes, areaName) => {
      if (areaName !== 'sync') {
        return
      }
      if (changes.uploadConfig) {
        const newValue = changes.uploadConfig.newValue as UploadConfig
        if (newValue) {
          callback(newValue)
        }
      }
    }
    browser.storage.onChanged.addListener(handleStorageChange)
    onBeforeUnmount(() => {
      browser.storage.onChanged.removeListener(handleStorageChange)
    })
  }
}
