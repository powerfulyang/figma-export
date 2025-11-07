import { sendMessage } from 'webext-bridge/content-script'

export interface UploadOptions {
  onProgress?: (progress: number) => void
}

/**
 * Upload a file by delegating to the background script (bypasses CORS).
 * The file is serialized and sent via webext-bridge message.
 * Must be called from a user gesture context for permission requests.
 */
export async function uploadFile(
  blobUrl: string,
  fileName: string,
  options: UploadOptions,
): Promise<string> {
  // Signal start of upload
  options.onProgress?.(0)

  // Send blobUrl and fileName to background script, which will fetch the blob content
  const result = await sendMessage('upload-file', { blobUrl, fileName }, 'background') as { url: string }

  // Signal completion
  options.onProgress?.(1)

  return result.url
}
