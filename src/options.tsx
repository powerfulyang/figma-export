import { AnimatePresence } from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import { ToastContainer } from "react-toastify"
import { concatMap, interval, map, merge, startWith, Subject } from "rxjs"

import { AssetsTable } from "~components/AssetsTable"
import { SettingsModal } from "~components/SettingsModal"
import { localStorage } from "~contents/bridge"
import { AssetSavedStorageKey, type Asset } from "~libs/storage"

import "src/style.scss"

function IndexOptions() {
  const [activeTab, setActiveTab] = useState<"image" | "svg">("image")
  const [showSettings, setShowSettings] = useState(false)

  const [imageList, setImageList] = useState<Asset[]>([])
  const [svgList, setSvgList] = useState<Asset[]>([])
  const refresh$ = useMemo(() => new Subject<void>(), [])

  function refreshList() {
    refresh$.next()
  }

  useEffect(() => {
    const $ = merge(interval(1000 * 60).pipe(startWith(0)), refresh$)
      .pipe(
        concatMap(() => localStorage.get<Asset[]>(AssetSavedStorageKey)),
        map((assets, index) => ({ assets, index }))
      )
      .subscribe(({ assets, index }) => {
        const imageList = assets
          .filter((item) => item.type === "image")
          .sort((a, b) => b.updatedAt - a.updatedAt)
        const svgList = assets
          .filter((item) => item.type === "svg")
          .sort((a, b) => b.updatedAt - a.updatedAt)
        if (index === 0 && !imageList.length) {
          setActiveTab("svg")
        }
        setImageList(imageList)
        setSvgList(svgList)
      })

    return () => {
      $.unsubscribe()
      refresh$.complete()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-[90rem] mx-auto p-4 md:p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">资源管理器</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            便捷的图片和SVG资源管理工具，支持快速上传、预览和管理您的媒体资源。自动保存历史记录，随时查看和使用。
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-4 md:p-6 mb-8 border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab("image")}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                    activeTab === "image"
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}>
                  图片列表
                </button>
                <button
                  onClick={() => setActiveTab("svg")}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                    activeTab === "svg"
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}>
                  SVG 列表
                </button>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                设置
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[calc(100vh-380px)] flex flex-col">
              <AssetsTable
                type={activeTab}
                data={activeTab === "image" ? imageList : svgList}
                onDeleted={refreshList}
              />
            </div>
          </div>
        </div>

        <footer className="text-center pb-4">
          <div className="text-sm text-gray-500 font-light">
            © 2024 All Rights Reserved
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      <ToastContainer theme="colored" />
    </div>
  )
}

export default IndexOptions
