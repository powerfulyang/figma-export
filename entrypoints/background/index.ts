import type { FormDataUploadConfig, OssUploadConfig, UploadConfig } from '@/types/settings'
import { AwsClient } from 'aws4fetch'
import { get } from 'lodash-es'
import { v4 } from 'uuid'
import { onMessage } from 'webext-bridge/background'
import { addHistoryRecord, getUploadConfig } from '@/utils/storage'

/**
 * Upload via FormData POST to a configurable endpoint.
 * Runs in background script to bypass CORS.
 */
async function uploadViaFormData(
  blob: Blob,
  fileName: string,
  config: FormDataUploadConfig,
): Promise<string> {
  if (!config.url) {
    throw new Error('上传地址未配置，请前往插件设置页面配置上传地址。')
  }

  const formData = new FormData()
  formData.append(config.fileFieldName || 'file', blob, fileName)

  // Append extra fields with template variable support
  if (config.extraFields) {
    for (const [key, value] of Object.entries(config.extraFields)) {
      const resolved = value
        .replace('{{filename}}', fileName)
        .replace('{{filesize}}', blob.size.toString())
        .replace('{{uuid}}', v4())
      formData.append(key, resolved)
    }
  }

  const response = await fetch(config.url, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`上传失败: HTTP ${response.status} ${response.statusText}`)
  }

  const resData = await response.json()
  const fileUrl = get(resData, config.responseUrlPath || '')
  if (!fileUrl) {
    throw new Error(`无法从响应中提取文件URL，响应路径 "${config.responseUrlPath}" 未找到有效值。`)
  }
  return fileUrl
}

/**
 * Upload via S3-compatible PutObject API using aws4fetch.
 * Works with AWS S3, Alibaba OSS, MinIO, Cloudflare R2, etc.
 * Runs in background script to bypass CORS.
 */
async function uploadViaOss(
  blob: Blob,
  fileName: string,
  config: OssUploadConfig,
): Promise<string> {
  if (!config.endpoint || !config.bucket || !config.accessKeyId || !config.accessKeySecret) {
    throw new Error('OSS 配置不完整，请前往插件设置页面完善 OSS 配置。')
  }

  const aws = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.accessKeySecret,
    service: 's3',
  })

  const endpoint = config.endpoint.startsWith('http') ? config.endpoint : `https://${config.endpoint}`
  const dir = config.directory ? `${config.directory.replace(/\/$/, '')}/` : ''
  const objectKey = `${dir}${v4()}_${fileName}`

  const url = new URL(endpoint)
  const host = `${config.bucket}.${url.host}`
  const pathname = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`

  // Use virtual-host style URL: {bucket}.{endpoint}/{key}
  const putUrl = `${url.protocol}//${host}${pathname}${encodeURIComponent(objectKey).replace(/%2F/g, '/')}`

  const response = await aws.fetch(putUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': blob.type || 'application/octet-stream',
    },
    body: blob,
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`上传失败: HTTP ${response.status} ${response.statusText}\n${errText}`)
  }

  // Build the public URL
  if (config.customDomain) {
    const domain = config.customDomain.replace(/\/$/, '')
    return `${domain}/${objectKey}`
  }
  return `${url.protocol}//${host}${pathname}${objectKey}`
}

export default defineBackground(() => {
  // Handle upload requests from content script
  onMessage('upload-file', async (message) => {
    const { data } = message
    const { blobUrl, fileName } = data as {
      blobUrl: string
      fileName: string
    }

    // Fetch blob content from the blobUrl in the background script
    const blob = await fetch(blobUrl).then(res => res.blob())

    const config: UploadConfig = await getUploadConfig()

    let result: { url: string }
    switch (config.mode) {
      case 'formdata':
        result = { url: await uploadViaFormData(blob, fileName, config) }
        break
      case 'oss':
        result = { url: await uploadViaOss(blob, fileName, config) }
        break
      default:
        throw new Error(`不支持的上传模式: ${(config as any).mode}`)
    }

    // Record history
    await addHistoryRecord({
      type: 'upload',
      name: fileName,
      url: result.url,
    })

    return result
  })
})
