export {}

declare global {
  interface Window {
    figma: PluginAPI
    figma_for_ui_content: PluginAPI
  }
}
