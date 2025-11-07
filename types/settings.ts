export interface CssExportSettings {
  useRem: boolean
  rootFontSize: number
}

export interface SelectionPanelPosition {
  x: number
  y: number
}

// Common settings shared by all upload config modes
interface BaseUploadConfig {
  exportScale: number
  autoIconApiUrl: string
  svgAutoCurrentColor: boolean
  cssExportSettings: CssExportSettings
  selectionPanelPosition?: SelectionPanelPosition
}

// Upload configuration types
export interface FormDataUploadConfig extends BaseUploadConfig {
  mode: 'formdata'
  /** Upload endpoint URL */
  url: string
  /** File field name in FormData, default: 'file' */
  fileFieldName: string
  /** Additional custom fields appended to FormData (key-value pairs) */
  extraFields: Record<string, string>
  /** JSONPath-like dot notation to extract the result URL from response, e.g. 'data.filePath' */
  responseUrlPath: string
}

export interface OssUploadConfig extends BaseUploadConfig {
  mode: 'oss'
  /** S3-compatible endpoint, e.g. 'https://s3.us-east-1.amazonaws.com' or 'https://oss-cn-hangzhou.aliyuncs.com' */
  endpoint: string
  bucket: string
  accessKeyId: string
  accessKeySecret: string
  /** Upload directory prefix, e.g. 'figma-export/' */
  directory: string
  /** Custom domain for generated URL, e.g. 'https://cdn.example.com'. If empty, uses endpoint + bucket URL */
  customDomain: string
}

export type UploadConfig = FormDataUploadConfig | OssUploadConfig

export interface SyncStorage {
  uploadConfig: UploadConfig
}
