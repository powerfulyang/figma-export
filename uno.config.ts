import presetAttributify from '@unocss/preset-attributify'
import { defineConfig, presetIcons, presetWind4, transformerDirectives } from 'unocss'

export default defineConfig({
  presets: [
    presetWind4(),
    presetAttributify(),
    presetIcons({
      autoInstall: true,
    }),
  ],
  transformers: [
    transformerDirectives(),
  ],
})
