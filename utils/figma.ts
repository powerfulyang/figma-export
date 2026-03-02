export function getCanvas() {
  // Need to ensure the whole plugin is rendered after canvas is ready
  // so that we can cast the result to HTMLElement here.
  // The `waitFor` logic is in `./index.ts`.
  return document.querySelector('#fullscreen-root .gpu-view-content canvas') as HTMLElement
}

export function getLeftPanel() {
  // Similar to `getCanvas()`.
  return document.querySelector('#left-panel-container') as HTMLElement
}

export function listenSelectionChange(callback: () => void) {
  const canvas = getCanvas()
  const objectsPanel = getLeftPanel()
  function handleClick() {
    callback()
  }
  function handleKeyDown(e: KeyboardEvent) {
    if ((e.target as Element).classList.contains('focus-target')) {
      // command + A or another shortcut that changes selection
      callback()
    }
  }
  const options = { capture: true }
  canvas.addEventListener('click', handleClick, options)
  objectsPanel.addEventListener('click', handleClick, options)
  window.addEventListener('keydown', handleKeyDown, options)
  logger.log('start listening selection change')
}
