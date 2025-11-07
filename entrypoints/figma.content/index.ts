export default defineContentScript({
  matches: ['https://www.figma.com/*'],
  runAt: 'document_end',
  world: 'MAIN',

  main() {
    // 核心注入逻辑
    const codeToInject = `
      const interval = setInterval(() => {
        if (window.figma && !window.figma.then) {
          window.figma_for_ui_content = window.figma
          clearInterval(interval)
        }
      }, 1000);
    `

    const script = document.createElement('script')
    script.textContent = codeToInject;
    (document.head || document.documentElement).appendChild(script)
    script.remove()
  },
})
