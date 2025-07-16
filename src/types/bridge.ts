export enum BridgeMessageType {
  GET_UPLOAD_CONFIG = "getUploadConfig",
  GET_SAVED_ASSETS = "getSavedAssets",
  SAVE_ASSET = "saveAsset",
  // 删除
  DELETE_ASSET = "deleteAsset"
}

export enum BridgeMessageSource {
  MAIN_WORLD = "MAIN_WORLD",
  ISOLATED = "ISOLATED"
}

export interface BridgeEventMessage {
  data: {
    source: BridgeMessageSource
    type: BridgeMessageType
    payload?: any
    result?: any
  }
}
