export const SERVICE = 'Figma Export'
const STYLE = 'color: #1890ff; font-weight: bold;'

export const logger = (['log', 'warn', 'error'] as const).reduce((acc, method) => {
  acc[method] = (...args: any[]) => {
    const [first, ...rest] = args
    const isStr = typeof first === 'string'
    const params = isStr
      ? [`%c[${SERVICE}]%c ${first}`, STYLE, '', ...rest]
      : [`%c[${SERVICE}]`, STYLE, ...args]
    // eslint-disable-next-line no-console
    console[method](...params)
  }
  return acc
}, {} as Record<'log' | 'warn' | 'error', (...args: any[]) => void>)
