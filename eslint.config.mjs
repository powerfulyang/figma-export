import antfu from '@antfu/eslint-config'

export default antfu(
  // options
  {
    ignores: [
      'src/orval/*',
      'pnpm-lock.yaml',
      'public/*',
      'docs/*',
      '*.md',
      'pnpm-workspace.yaml',
    ],
    unocss: true,
    formatters: {
      /**
       * Format CSS, LESS, SCSS files, also the `<style>` blocks in Vue
       * By default uses Prettier
       */
      css: true,
      /**
       * Format HTML files
       * By default uses Prettier
       */
      html: true,
      /**
       * Format Markdown files
       * Supports Prettier and dprint
       * By default uses Prettier
       */
      markdown: 'prettier',
    },
  },
  {
    // rules
    rules: {
      'antfu/no-top-level-await': 'off',
      'eslint-comments/no-unlimited-disable': 'off',
      'ts/ban-ts-comment': 'off',
    },
  },
)
