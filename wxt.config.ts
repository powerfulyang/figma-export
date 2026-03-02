import AutoImport from 'unplugin-auto-import/vite'
import { ArcoResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue', '@wxt-dev/unocss'],
  vite: () => {
    return {
      optimizeDeps: {
        exclude: ['@jsquash/png', '@jsquash/webp'],
      },
      plugins: [
        AutoImport({
          dts: 'auto-typings/auto-imports.d.ts',
          resolvers: [ArcoResolver()],
        }),
        Components({
          dirs: ['components'],
          dts: 'auto-typings/components.d.ts',
          resolvers: [
            ArcoResolver({
              sideEffect: true,
            }),
          ],
        }),
      ],
    }
  },
  manifest: {
    description: 'A chrome extension for figma export',
    web_accessible_resources: [
      {
        resources: ['injected.js'],
        matches: ['https://www.figma.com/*'],
      },
      {
        resources: ['unlock.js'],
        matches: ['https://www.figma.com/*'],
      },
    ],
    host_permissions: ['https://www.figma.com/design/*'],
    optional_host_permissions: ['<all_urls>'],
    permissions: ['storage', 'declarativeNetRequest'],
    declarative_net_request: {
      rule_resources: [
        {
          id: 'unlock',
          enabled: true,
          path: '/unlock.json',
        },
      ],
    },
  },
  unocss: {
    // Exclude unocss from running for the background
    excludeEntrypoints: ['background'],
  },
})
