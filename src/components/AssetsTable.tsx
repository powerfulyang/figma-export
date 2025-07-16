import { motion } from "framer-motion"

import { cn } from "~libs/cn"
import { svgStringToDataURL } from "~libs/getDataURL"
import { deleteAsset, type Asset } from "~libs/storage"
import { hasWhiteComponent } from "~libs/svg"

import { ActionButton } from "./ActionButton"

interface AssetsTableProps {
  type: "image" | "svg"
  data: Asset[]
  onDeleted: () => void
}

export function AssetsTable({ type, data, onDeleted }: AssetsTableProps) {
  if (data.length === 0) {
    return (
      <motion.div className="col-span-3 flex flex-col items-center justify-center text-gray-500 py-12 flex-1">
        <svg
          className="w-20 h-20 mb-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={
              type === "image"
                ? "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                : "M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2z"
            }
          />
        </svg>
        <p className="text-lg">暂无{type === "image" ? "图片" : "SVG"}资源</p>
      </motion.div>
    )
  }

  async function deleteItem(id: string) {
    await deleteAsset(id)
    onDeleted()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {data.map((asset, index) => (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          key={asset.id}
          className="relative group h-48 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg">
          {type === "image" ? (
            <img
              src={asset.imageUrl}
              alt={`Image ${index + 1}`}
              className="w-full h-full object-contain p-5"
            />
          ) : (
            <div
              className={cn(
                "w-full h-full flex items-center justify-center p-5",
                {
                  "bg-gray-900": hasWhiteComponent(asset.svgString)
                }
              )}>
              <img
                src={svgStringToDataURL(asset.svgString)}
                alt={`SVG ${index + 1}`}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center p-4">
            <div className="flex flex-col gap-2 w-full">
              {type === "image" ? (
                <>
                  <ActionButton
                    onClick={() =>
                      navigator.clipboard.writeText(asset.imageUrl || "")
                    }
                    className="w-full bg-white/90 hover:bg-white text-gray-800 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    text="复制图片地址"
                    successText="复制成功"
                  />
                  <ActionButton
                    onClick={() => deleteItem(asset.id)}
                    className="w-full bg-red-50/90 hover:bg-red-50 text-red-600 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    text="删除记录"
                    successText="已删除"
                    icon={
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 20 20"
                        fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    }
                    successIcon={
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 20 20"
                        fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    }
                  />
                </>
              ) : (
                <>
                  <ActionButton
                    onClick={() =>
                      navigator.clipboard.writeText(asset.svgString || "")
                    }
                    className="w-full bg-white/90 hover:bg-white text-gray-800 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    text="复制 svg 字符串"
                    successText="复制成功"
                  />
                  <ActionButton
                    onClick={() =>
                      navigator.clipboard.writeText(
                        svgStringToDataURL(asset.svgString || "")
                      )
                    }
                    className="w-full bg-white/90 hover:bg-white text-gray-800 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    text="复制 base64 地址"
                    successText="复制成功"
                  />
                  <ActionButton
                    onClick={() => deleteItem(asset.id)}
                    className="w-full bg-red-50/90 hover:bg-red-50 text-red-600 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    text="删除记录"
                    successText="已删除"
                    icon={
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 20 20"
                        fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    }
                    successIcon={
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 20 20"
                        fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    }
                  />
                </>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
