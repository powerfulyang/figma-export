
function isAsset(node: SceneNode) {
  return node.isAsset
}

// 判断节点是否为图片节点
function isImageNode(
  node: SceneNode
): node is
  | RectangleNode
  | EllipseNode
  | PolygonNode
  | StarNode
  | FrameNode
  | GroupNode {
  if (!isAsset(node)) {
    return false
  }
  if ("fills" in node && Array.isArray(node.fills)) {
    return node.fills.some((fill) => fill.type === "IMAGE")
  }
  return false
}

/**
 * @description 判断是不是 svg
 * @note 在 kg 基本只有 image 和 svg 的 node.isAsset 为 true
 */
function isSVGNode(node: SceneNode): boolean {
  return isAsset(node) && !isImageNode(node)
}

/**
 * @description 判断是不是 component
 * @note 在 kg 基本都是 svg 组件
 */
function isInstanceNode(node: SceneNode): boolean {
  return node.type === "INSTANCE"
}

export interface ExtractAssetsResult {
  imageList: {
    asset: SceneNode
    image: Uint8Array
    url?: string
  }[]
  svgList: {
    asset: SceneNode
    svg: string
    url?: string
  }[]
}

/**
 * 获取当前选中的资源（图片和 SVG）
 */
export async function extractAssets(selection: readonly SceneNode[]) {
  const assets: SceneNode[] = []
  const stack: SceneNode[] = [...selection]

  while (stack.length > 0) {
    const node = stack.pop()

    if (!node) continue

    if (isInstanceNode(node)) {
      // 如果是 instance 节点
      assets.push(node)
    } else if (isImageNode(node) || isSVGNode(node)) {
      // 判断节点是否为图片或 SVG，并加入资产列表
      assets.push(node)
    } else if ("children" in node && Array.isArray(node.children)) {
      // 如果节点有子节点，递归处理
      stack.push(...node.children)
    }
  }

  const result = {
    imageList: [],
    svgList: []
  }

  // 输出收集到的资产类型和相关信息
  for (const asset of assets) {
    if (isImageNode(asset)) {
      try {
        const image = await asset.exportAsync({
          format: "PNG",
          constraint: {
            type: "SCALE",
            value: 3
          }
        })
        // const blob = new Blob([image], { type: "image/png" })
        // const url = await getDataURL(blob)
        // console.log(
        //   `%c `,
        //   `padding: 100px 200px;
        //    background-image: url('${url}');
        //    background-size: contain;
        //    background-repeat: no-repeat;
        //    background-position: center;
        //    `
        // )
        result.imageList.push({
          asset,
          image
        })
      } catch (e) {
        console.error("image export error", e, asset)
      }
    } else if (isSVGNode(asset) || isInstanceNode(asset)) {
      try {
        const svg = await asset.exportAsync({
          format: "SVG_STRING"
        })
        // const blob = new Blob([svg], { type: "image/svg+xml" })
        // const url = await getDataURL(blob)
        // console.log(
        //   `%c `,
        //   `padding: 100px 200px;
        //    background-image: url('${url}');
        //    background-size: contain;
        //    background-repeat: no-repeat;
        //    background-position: center;
        //    `
        // )
        result.svgList.push({
          asset,
          svg
        })
      } catch (e) {
        console.error("svg export error", e, asset)
      }
    }
  }

  return result
}
