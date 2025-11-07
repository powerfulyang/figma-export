export function getContainer() {
  const host = document.querySelector('wxt-figma-export-root')
  return host?.shadowRoot?.querySelector('body') as HTMLElement
}
