import cssText from "data-text:~/style.scss"
import type { PlasmoCSConfig } from "plasmo"
import { useState } from "react"
import { toast, ToastContainer } from "react-toastify"

import { LoadingButton } from "~components/LoadingButton"
import ResultModal from "~components/ResultModal"
import { useFigma } from "~hooks/useFigma"
import { extractAssets, type ExtractAssetsResult } from "~libs/extractAssets"

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export const config: PlasmoCSConfig = {
  matches: ["https://www.figma.com/design/*"],
  world: "MAIN"
}

const UploadButton = () => {
  const isDevMode = useFigma()

  const [extracting, setExtracting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<ExtractAssetsResult>()
  const [showModal, setShowModal] = useState(false)

  const handleExtract = async () => {
    setExtracting(true)
    try {
      const { selection } = figma.currentPage
      const extractedResult = await extractAssets(selection)
      setResult(extractedResult)
      setShowModal(true)
    } catch {
      toast.error("提取失败")
    } finally {
      setExtracting(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const { selection } = figma.currentPage
      const imageList = []
      const svgList = []
      for (const node of selection) {
        try {
          const image = await node.exportAsync({
            format: "PNG",
            constraint: {
              type: "SCALE",
              value: 3
            }
          })
          imageList.push({
            asset: node,
            image
          })
          const svg = await node.exportAsync({
            format: "SVG_STRING"
          })
          svgList.push({
            asset: node,
            svg
          })
        } catch {
          // 忽略导出失败
        }
      }
      setResult({ imageList, svgList })
      setShowModal(true)
    } catch {
      toast.error("导出失败")
    } finally {
      setExporting(false)
    }
  }

  const exportIcon = (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
    />
  )

  const extractIcon = (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  )

  return (
    isDevMode && (
      <>
        <ToastContainer theme="colored" />
        <div className="fixed bottom-[24px] right-[66px] flex gap-2">
          <LoadingButton
            title="导出选中元素"
            onClick={handleExport}
            isLoading={exporting}
            icon={exportIcon}
          />
          <LoadingButton
            title="提取选中区域资源"
            onClick={handleExtract}
            isLoading={extracting}
            icon={extractIcon}
          />
        </div>
        {showModal && result && (
          <ResultModal result={result} onClose={() => setShowModal(false)} />
        )}
      </>
    )
  )
}

export default UploadButton
