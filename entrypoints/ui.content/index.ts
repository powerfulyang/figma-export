import { allowWindowMessaging, onMessage } from 'webext-bridge/content-script'
import App from '@/entrypoints/ui.content/App.vue'

export default defineContentScript({
  matches: ['https://www.figma.com/design/*'],
  // 2. Set cssInjectionMode
  cssInjectionMode: 'ui',

  async main(ctx) {
    allowWindowMessaging(SERVICE)
    //   // 注入脚本到页面上下文，所有逻辑都在 injected.ts 中
    void injectScript('/injected.js', {
      keepInDom: true,
    })
    // 3. Define your UI
    const ui = await createShadowRootUi(ctx, {
      name: 'wxt-figma-export-root',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        // Define how your UI will be mounted inside the container
        const app = createApp(App)
        app.mount(container)
        return app
      },
      onRemove: (app) => {
        // Unmount the app when the UI is removed
        app?.unmount()
      },
    })

    // 4. Mount the UI
    ui.mount()

    // message
    onMessage('get-css-settings', async () => {
      return getCssExportSettings()
    })
  },
})
