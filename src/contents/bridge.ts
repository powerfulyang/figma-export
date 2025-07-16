import type { PlasmoCSConfig } from "plasmo"

import { Storage } from "@plasmohq/storage"

import { getUploadConfig } from "~constants"
import { AssetSavedStorageKey, type Asset } from "~libs/storage"
import { BridgeMessageSource, BridgeMessageType } from "~types/bridge"

export const config: PlasmoCSConfig = {
  matches: ["https://www.figma.com/design/*"]
}

export const localStorage = new Storage({ area: "local" })

// bridge.js
window.addEventListener("message", async (event) => {
  if (
    event.source !== window ||
    !event.data ||
    event.data.source !== BridgeMessageSource.MAIN_WORLD ||
    !chrome.runtime
  ) {
    // MAIN WORLD 不处理
    return
  }

  switch (event.data.type) {
    case BridgeMessageType.GET_UPLOAD_CONFIG: {
      const config = await getUploadConfig()
      window.postMessage({
        source: BridgeMessageSource.ISOLATED,
        type: BridgeMessageType.GET_UPLOAD_CONFIG,
        result: config
      })
      break
    }

    case BridgeMessageType.GET_SAVED_ASSETS: {
      const assets =
        (await localStorage.get<Asset[]>(AssetSavedStorageKey)) || []
      window.postMessage({
        source: BridgeMessageSource.ISOLATED,
        type: BridgeMessageType.GET_SAVED_ASSETS,
        result: assets
      })
      break
    }

    case BridgeMessageType.SAVE_ASSET: {
      const existingAssets =
        (await localStorage.get<Asset[]>(AssetSavedStorageKey)) || []
      const newAsset = event.data.payload

      const existAsset = existingAssets.find(
        (item) =>
          item.nodeId === newAsset.nodeId &&
          item.designUrl === newAsset.designUrl
      )

      if (!existAsset) {
        await localStorage.set(AssetSavedStorageKey, [
          ...existingAssets,
          newAsset
        ])
      } else {
        // 修改 updatedAt
        const excludedAssets = existingAssets.filter(
          (item) => item.id !== existAsset.id
        )
        await localStorage.set(AssetSavedStorageKey, [
          ...excludedAssets,
          { ...newAsset, updatedAt: Date.now() }
        ])
      }

      window.postMessage({
        source: BridgeMessageSource.ISOLATED,
        type: BridgeMessageType.SAVE_ASSET,
        result: { success: true }
      })
      break
    }

    case BridgeMessageType.DELETE_ASSET: {
      const existingAssets =
        (await localStorage.get<Asset[]>(AssetSavedStorageKey)) || []
      const newAssets = existingAssets.filter(
        (item) => item.id !== event.data.payload
      )
      await localStorage.set(AssetSavedStorageKey, newAssets)
      window.postMessage({
        source: BridgeMessageSource.ISOLATED,
        type: BridgeMessageType.DELETE_ASSET,
        result: { success: true }
      })
      break
    }
  }
})
