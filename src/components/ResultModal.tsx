import { useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"
import { filter, fromEvent, tap } from "rxjs"

import { cn } from "~libs/cn"
import type { ExtractAssetsResult } from "~libs/extractAssets"
import { svgStringToDataURL } from "~libs/getDataURL"
import { getUploadConfig, saveSvg } from "~libs/storage"
import { hasWhiteComponent } from "~libs/svg"

import { ActionButton } from "./ActionButton"
import { CustomNameModal } from "./CustomNameModal"
import { UploadButton } from "./UploadButton"

interface ResultModalProps {
  result: ExtractAssetsResult
  onClose: () => void
}

function getUrl(image: Uint8Array | string) {
  if (typeof image === "string") {
    const blob = new Blob([image], { type: "image/svg+xml" })
    return URL.createObjectURL(blob)
  }
  const blob = new Blob([image], { type: "image/png" })
  return URL.createObjectURL(blob)
}

export default function ResultModal({ result, onClose }: ResultModalProps) {
  const [activeTab, setActiveTab] = useState<"image" | "svg">("image")
  const [list, setList] = useState<ExtractAssetsResult>({
    imageList: [],
    svgList: []
  })
  const [showCustomNameModal, setShowCustomNameModal] = useState(false)
  const [currentSvg, setCurrentSvg] = useState<string>("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const subscription = fromEvent<WheelEvent>(ref.current, "wheel")
      .pipe(tap((event) => event.stopImmediatePropagation()))
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 按 esc 关闭
  useEffect(() => {
    const subscription = fromEvent<KeyboardEvent>(ref.current, "keydown")
      .pipe(
        filter((event) => event.key === "Escape"),
        tap((event) => event.stopImmediatePropagation())
      )
      .subscribe(() => {
        onClose()
      })
    return () => {
      subscription.unsubscribe()
    }
  }, [onClose])

  useEffect(() => {
    if (result) {
      // 如果 result.imageList 为空
      if (result.imageList.length === 0) {
        setActiveTab("svg")
      }
      setList({
        imageList: result.imageList.map(({ asset, image }) => ({
          asset,
          image,
          url: getUrl(image)
        })),
        svgList: result.svgList.map(({ asset, svg }) => ({
          asset,
          svg,
          url: svgStringToDataURL(svg)
        }))
      })

      return () => {
        // revoke 资源
        list.imageList.forEach(({ url }) => URL.revokeObjectURL(url))
      }
    }
  }, [result])

  function handleAutoIcon(svg: string) {
    setCurrentSvg(svg)
    setShowCustomNameModal(true)
  }

  async function handleCustomNameConfirm(customName: string) {
    const config = await getUploadConfig()
    if (config.svgActionEndpoint) {
      const response = await fetch(config.svgActionEndpoint, {
        method: "POST",
        body: JSON.stringify({
          content: currentSvg,
          name: customName
        })
      })
      const data = await response.json()
      if (data.success) {
        void navigator.clipboard.writeText(
          `<div class="i-custom-${customName}"></div>`
        )
        toast.success("处理成功，使用代码已写入剪贴板")
      } else {
        toast.error(data.message)
      }
    } else {
      toast.error("请先配置 SVG 处理地址")
    }
  }

  return (
    <div
      ref={ref}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg w-[70vw] h-[70vh] p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="flex space-x-4">
            <button
              className={`px-4 py-2 rounded-lg ${
                activeTab === "image"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
              onClick={() => setActiveTab("image")}>
              图片
            </button>
            <button
              className={`px-4 py-2 rounded-lg ${
                activeTab === "svg"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
              onClick={() => setActiveTab("svg")}>
              SVG
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className={"flex-1 overflow-y-auto "}>
          <div className="grid grid-cols-3 gap-4 py-4">
            {activeTab === "image" &&
              (list.imageList.length > 0 ? (
                list.imageList.map(({ url, image, asset }, index) => (
                  <div
                    key={index}
                    className="relative group aspect-[16/9] border rounded-lg overflow-hidden">
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-full object-contain p-5"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex flex-col gap-4 w-full px-10">
                        <a
                          type={"button"}
                          className="bg-white text-gray-800 px-3 py-1 rounded-lg text-sm text-center"
                          href={url}
                          target="_blank">
                          预览
                        </a>
                        <UploadButton asset={asset} image={image} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 flex flex-col items-center justify-center text-gray-500 py-20">
                  <svg
                    className="w-16 h-16 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p>暂无图片资源</p>
                </div>
              ))}

            {activeTab === "svg" &&
              (list.svgList.length > 0 ? (
                list.svgList.map(({ url, svg, asset }, index) => (
                  <div
                    key={index}
                    className="relative group aspect-[16/9] border rounded-lg overflow-hidden">
                    <img
                      src={url}
                      alt={`SVG ${index + 1}`}
                      className={cn("w-full h-full object-contain p-5", {
                        "bg-gray-900": hasWhiteComponent(svg)
                      })}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex flex-col gap-4 w-full px-10">
                        <div
                          className="bg-white text-gray-800 px-3 py-1 rounded-lg text-sm text-center cursor-pointer"
                          onClick={() => handleAutoIcon(svg)}>
                          Auto Icon
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <ActionButton
                            onClick={() => navigator.clipboard.writeText(url)}
                            className="bg-white text-gray-800 px-3 py-1 rounded-lg text-sm text-center"
                            text={"复制"}
                            successText="成功"
                          />
                          <ActionButton
                            onClick={() => saveSvg(asset)}
                            className="bg-white text-gray-800 px-3 py-1 rounded-lg text-sm"
                            text="收藏"
                            successText="成功"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 flex flex-col items-center justify-center text-gray-500 py-20">
                  <svg
                    className="w-16 h-16 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p>暂无SVG资源</p>
                </div>
              ))}
          </div>
        </div>
      </div>
      <CustomNameModal
        isOpen={showCustomNameModal}
        onClose={() => setShowCustomNameModal(false)}
        onConfirm={handleCustomNameConfirm}
        defaultName="auto-icon"
      />
    </div>
  )
}
