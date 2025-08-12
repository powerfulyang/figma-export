import { AnimatePresence, motion } from "framer-motion"
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

  async function handleCustomNameConfirm(options: { name: string; withSize: boolean; withDiv: boolean }) {
    const { name: customName, withSize, withDiv } = options
    const config = await getUploadConfig()
    if (config.svgActionEndpoint) {
      const parser = new DOMParser()
      const doc = parser.parseFromString(currentSvg, "image/svg+xml")
      const svgElement = doc.documentElement
      const width = svgElement.getAttribute("width")
      const height = svgElement.getAttribute("height")

      // 根据选项决定是否移除 width 和 height 属性
      if (!withSize) {
        svgElement.removeAttribute("width")
        svgElement.removeAttribute("height")
      }

      const newContent = svgElement.outerHTML
      const response = await fetch(config.svgActionEndpoint, {
        method: "POST",
        body: JSON.stringify({
          content: newContent,
          name: customName,
          withSize,
          withDiv
        })
      })
      const data = await response.json()
      let result = ''
      if (data.success) {
        result = `i-custom-${customName}`
        if (withSize) {
          result = `i-custom-${customName} w-[${width}px] h-[${height}px]`
        }
        if (withDiv) {
          result = `<div class="${result}"></div>`
        }
        void navigator.clipboard.writeText(result)
        toast.success("处理成功，使用代码已写入剪贴板")
      } else {
        toast.error(data.message)
      }
    } else {
      toast.error("请先配置 SVG 处理地址")
    }
  }

  return (
    <motion.div
      ref={ref}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}>
      <motion.div
        className="bg-white rounded-2xl w-[70vw] h-[70vh] p-6 flex flex-col shadow-2xl border border-gray-100"
        initial={{ scale: 0.9, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 50 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            <motion.button
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${activeTab === "image"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              onClick={() => setActiveTab("image")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}>
              图片
            </motion.button>
            <motion.button
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${activeTab === "svg"
                  ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              onClick={() => setActiveTab("svg")}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}>
              SVG
            </motion.button>
          </div>
          <motion.button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}>
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
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              className="grid grid-cols-3 gap-4 py-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}>
              {activeTab === "image" &&
                (list.imageList.length > 0 ? (
                  list.imageList.map(({ url, image, asset }, index) => (
                    <motion.div
                      key={index}
                      className="relative group aspect-[16/9] border rounded-xl overflow-hidden border-gray-200 hover:border-blue-300 hover:shadow-lg"
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      whileHover={{ y: -5, transition: { duration: 0.2 } }}>
                      <img
                        src={url}
                        alt={`Image ${index + 1}`}
                        className="w-full h-full object-contain p-5"
                      />
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100"
                        initial={false}
                        animate={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}>
                        <motion.div
                          className="flex flex-col gap-4 w-full px-10"
                          initial={{ y: 20, opacity: 0 }}
                          whileHover={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.1, duration: 0.2 }}>
                          <motion.a
                            type="button"
                            className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-2 rounded-lg text-sm text-center font-medium hover:bg-white transition-colors"
                            href={url}
                            target="_blank"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}>
                            预览
                          </motion.a>
                          <UploadButton asset={asset} image={image} />
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    className="col-span-3 flex flex-col items-center justify-center text-gray-500 py-20"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}>
                    <motion.svg
                      className="w-16 h-16 mb-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      initial={{ rotate: -10, scale: 0.8 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </motion.svg>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}>
                      暂无图片资源
                    </motion.p>
                  </motion.div>
                ))}

              {activeTab === "svg" &&
                (list.svgList.length > 0 ? (
                  list.svgList.map(({ url, svg, asset }, index) => (
                    <motion.div
                      key={index}
                      className="relative group aspect-[16/9] border rounded-xl overflow-hidden border-gray-200 hover:border-blue-300 hover:shadow-lg">
                      <img
                        src={url}
                        alt={`SVG ${index + 1}`}
                        className={cn("w-full h-full object-contain p-5", {
                          "bg-gray-900": hasWhiteComponent(svg)
                        })}
                      />
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <motion.div
                          className="flex flex-col gap-4 w-full px-10">
                          <motion.div
                            className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-2 rounded-lg text-sm text-center cursor-pointer font-medium hover:bg-white transition-colors"
                            onClick={() => handleAutoIcon(svg)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}>
                            Auto Icon
                          </motion.div>
                          <motion.div
                            className="grid grid-cols-2 gap-2">
                            <ActionButton
                              onClick={() => navigator.clipboard.writeText(url)}
                              className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-lg text-sm text-center font-medium hover:bg-white transition-colors"
                              text="复制"
                              successText="成功"
                            />
                            <ActionButton
                              onClick={() => saveSvg(asset)}
                              className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                              text="收藏"
                              successText="成功"
                            />
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  )) 
                ) : (
                  <motion.div
                    className="col-span-3 flex flex-col items-center justify-center text-gray-500 py-20">
                    <motion.svg
                      className="w-16 h-16 mb-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      initial={{ rotate: -10, scale: 0.8 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2z"
                      />
                    </motion.svg>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}>
                      暂无SVG资源
                    </motion.p>
                  </motion.div>
                ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
      <CustomNameModal
        isOpen={showCustomNameModal}
        onClose={() => setShowCustomNameModal(false)}
        onConfirm={handleCustomNameConfirm}
      />
    </motion.div>
  )
}
