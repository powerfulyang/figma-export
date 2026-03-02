import type { ExportedItem } from '@/types/item'
import { Message } from '@arco-design/web-vue'
import { addHistoryRecord, getAutoIconApiUrl } from '@/utils/storage'
import { getCustomIcon } from '@/utils/svg'
import { uploadFile } from '@/utils/upload'

/**
 * Shared action to upload an exported item (WebP) and copy URL to clipboard.
 */
export async function performUpload(item: ExportedItem) {
  if (!item.webpUrl) {
    Message.error('WEBP内容为空')
    return
  }

  const fileUrl = await uploadFile(item.webpUrl, `${item.name}.webp`)
  await navigator.clipboard.writeText(fileUrl)
  Message.success('成功上传文件，文件URL已复制到剪贴板')
  return fileUrl
}

/**
 * Shared action to send SVG content to Auto Icon API and copy generated code to clipboard.
 */
export async function performAutoIcon(item: ExportedItem, content: string) {
  const apiUrl = await getAutoIconApiUrl()
  if (!apiUrl) {
    Message.error('请先配置自动图标 API 地址')
    return
  }

  if (!content) {
    Message.error('SVG内容为空')
    return
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
    }),
  })
  const json = await res.json()
  if (json.success) {
    const icon = json.icon
    const iconCode = getCustomIcon(icon, item)
    await navigator.clipboard.writeText(iconCode)

    // Record history
    await addHistoryRecord({
      type: 'auto-icon',
      name: item.name,
      icon,
      url: iconCode,
      content,
    })

    Message.success('图标添加成功')
    return iconCode
  }
  else {
    Message.error(`图标添加失败，${json.message}`)
  }
}
