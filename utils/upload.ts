import { sendMessage } from 'webext-bridge/content-script'

export interface UploadOptions {
  // 获取不了进度
}

/**
 * Upload a file by delegating to the background script (bypasses CORS).
 * The file is serialized and sent via webext-bridge message.
 * Must be called from a user gesture context for permission requests.
 */
export async function uploadFile(
  blobUrl: string,
  fileName: string,
  _options?: UploadOptions,
): Promise<string> {
  // Send blobUrl and fileName to background script, which will fetch the blob content
  const result = await sendMessage('upload-file', { blobUrl, fileName }, 'background') as { url: string }
  return result.url
}
