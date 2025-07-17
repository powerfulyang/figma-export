import {
  syncStorage,
  UploadConfigStorageKey,
  type UploadConfig
} from "~libs/storage"

export const defaultUploadConfig: UploadConfig = {
  uploadUrl: "https://us4ever.com/api/proxy",
  uploadField: "file",
  imageFieldPath: "0.src",
  imageUrlPrefix: "https://im.gurl.eu.org",
  customFields: [],
  // svg action endpoint
  svgActionEndpoint: ""
}

export function getDefaultUploadConfig() {
  return defaultUploadConfig
}

export async function getUploadConfig() {
  return (
    (await syncStorage.get<UploadConfig>(UploadConfigStorageKey)) ||
    getDefaultUploadConfig()
  )
}
