import { fromEvent } from "rxjs"
import { v4 } from "uuid"

import { Storage } from "@plasmohq/storage"

import {
  BridgeMessageSource,
  BridgeMessageType,
  type BridgeEventMessage
} from "~types/bridge"

export type FieldType = "text" | "uuid" | "fileSize" | "filename"

export interface CustomField {
  key: string
  value: string
  label: string
  type: FieldType
}

export interface UploadConfig {
  uploadUrl: string
  uploadField: string
  imageFieldPath: string
  imageUrlPrefix: string
  customFields: CustomField[]
  svgActionEndpoint: string
}

export const syncStorage = new Storage()
export const UploadConfigStorageKey = "uploadConfig"
export const AssetSavedStorageKey = "asset:saved:list"

async function sendBridgeMessage<T>(
  type: BridgeMessageType,
  payload?: any
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const $ = fromEvent<BridgeEventMessage>(window, "message").subscribe(
      (event) => {
        if (
          event.data.source === BridgeMessageSource.ISOLATED &&
          event.data.type === type
        ) {
          resolve(event.data.result)
          $.unsubscribe()
        }
      }
    )
    window.postMessage({
      source: BridgeMessageSource.MAIN_WORLD,
      type,
      payload
    })
  })
}

export async function getUploadConfig() {
  return sendBridgeMessage<UploadConfig>(BridgeMessageType.GET_UPLOAD_CONFIG)
}

export interface Asset {
  id?: string
  nodeId: string
  type: "image" | "svg"
  imageUrl?: string
  svgString?: string
  designUrl?: string
  createdAt: number
  updatedAt?: number
}

export async function saveSvg(node: SceneNode) {
  const svg_str = await node.exportAsync({
    format: "SVG_STRING"
  })
  await saveAsset({
    nodeId: node.id,
    type: "svg",
    svgString: svg_str,
    createdAt: Date.now(),
    updatedAt: Date.now()
  })
}

export async function saveImage(node: SceneNode, fileUrl: string) {
  await saveAsset({
    nodeId: node.id,
    type: "image",
    imageUrl: fileUrl,
    createdAt: Date.now(),
    updatedAt: Date.now()
  })
}

/**
 * 获取本地保存的 asset 信息
 */
export async function getAssetSaved() {
  return sendBridgeMessage<Asset[]>(BridgeMessageType.GET_SAVED_ASSETS)
}

/**
 * 传入 asset 信息，保存到本地
 */
export async function saveAsset(asset: Asset) {
  const newAsset = {
    id: v4(),
    designUrl: window.location.origin,
    ...asset
  }
  return sendBridgeMessage<void>(BridgeMessageType.SAVE_ASSET, newAsset)
}

/**
 * 从本地存储中删除指定 id 的资源
 */
export async function deleteAsset(id: string) {
  return sendBridgeMessage<void>(BridgeMessageType.DELETE_ASSET, id)
}
