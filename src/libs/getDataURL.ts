export function getDataURL(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

export function svgStringToDataURL(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

export function dataURLtoBlob(dataUrl: string) {
  let arr = dataUrl.split(","),
    mime = arr[0].match(/:(.*?);/)[1],
    bStr = atob(arr[1]),
    n = bStr.length,
    u8arr = new Uint8Array(n)
  while (n--) u8arr[n] = bStr.charCodeAt(n)
  return new Blob([u8arr], { type: mime })
}
