export const SERVICE = 'Figma Export'
export function debugLog(message?: any, ...optionalParams: any[]) {
  console.log(`[${SERVICE}] ${message}`, ...optionalParams)
}
export function errorLog(message?: any, ...optionalParams: any[]) {
  console.error(`[${SERVICE}] ${message}`, ...optionalParams)
}
export function warnLog(message?: any, ...optionalParams: any[]) {
  console.warn(`[${SERVICE}] ${message}`, ...optionalParams)
}
