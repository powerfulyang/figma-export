import { resolve } from 'node:path'
import { defineWebExtConfig } from 'wxt'

export default defineWebExtConfig({
  // On Windows, the path must be absolute
  chromiumProfile: resolve('.wxt/chrome-data'),
  chromiumArgs: ['--start-maximized'],
  keepProfileChanges: true,
  startUrls: ['https://www.figma.com/design/Q4ZRATR0tNkBUnLUWPAp1q/Auto-Layout?node-id=294-1685&t=PocsFqmnbm6oBnKq-0'],
})
