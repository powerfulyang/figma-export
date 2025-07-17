import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"

import { getUploadConfig } from "~constants"
import {
  syncStorage,
  UploadConfigStorageKey,
  type CustomField,
  type FieldType
} from "~libs/storage"

interface SettingsModalProps {
  onClose: () => void
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [config, setConfig] = useState({
    uploadUrl: "",
    uploadField: "",
    imageFieldPath: "",
    imageUrlPrefix: "",
    customFields: [] as CustomField[],
    svgActionEndpoint: ""
  })
  const [saved, setSaved] = useState(false)

  // ... 保持原有的辅助函数 ...
  const isUUID = (value: string) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(value)
  }

  const isFilename = (key: string) => {
    return ["qqfilename", "qqfile"].includes(key)
  }

  const isFileSize = (key: string) => {
    return ["qqtotalfilesize"].includes(key)
  }

  useEffect(() => {
    const init = async () => {
      const savedConfig = await getUploadConfig()
      console.log(savedConfig)
      if (savedConfig) {
        setConfig({
          uploadUrl: savedConfig.uploadUrl || "",
          uploadField: savedConfig.uploadField || "",
          imageFieldPath: savedConfig.imageFieldPath || "",
          imageUrlPrefix: savedConfig.imageUrlPrefix || "",
          customFields: savedConfig.customFields || [],
          svgActionEndpoint: savedConfig.svgActionEndpoint || ""
        })
      }
    }
    void init()
  }, [])

  const handleSave = async () => {
    await syncStorage.set(UploadConfigStorageKey, {
      uploadUrl: config.uploadUrl.trim(),
      uploadField: config.uploadField.trim(),
      imageFieldPath: config.imageFieldPath.trim(),
      imageUrlPrefix: config.imageUrlPrefix.trim(),
      customFields: config.customFields,
      svgActionEndpoint: config.svgActionEndpoint.trim()
    })
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onClose()
    }, 500)
  }

  // ... 保持其他原有的处理函数 ...
  const addCustomField = () => {
    setConfig({
      ...config,
      customFields: [
        ...config.customFields,
        {
          key: "",
          value: "",
          type: "text",
          label: `自定义字段 ${config.customFields.length + 1}`
        }
      ]
    })
  }

  const updateField = (index: number, field: Partial<CustomField>) => {
    const newFields = [...config.customFields]
    newFields[index] = {
      ...newFields[index],
      ...field,
      key: field.key?.trim() || newFields[index].key,
      value: field.value?.trim() || newFields[index].value
    }
    setConfig({
      ...config,
      customFields: newFields
    })
  }

  const removeField = (index: number) => {
    setConfig({
      ...config,
      customFields: config.customFields.filter((_, i) => i !== index)
    })
  }

  const parseFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()

      // 尝试解析JSON
      try {
        const jsonConfig = JSON.parse(text)
        setConfig(jsonConfig)
        // 显示成功提示
        toast.success("配置已从JSON导入")

        return // 如果JSON解析成功，就不继续解析行文本
      } catch (jsonErr) {
        // JSON解析失败，继续尝试解析行文本
        toast.error("剪贴板内容不是有效的JSON，尝试解析行文本")
      }

      // 按行解析文本（原有功能）
      const lines = text.split("\n")
      const newFields: CustomField[] = []

      lines.forEach((line, index) => {
        const [key, ...values] = line.split(":").map((s) => s)
        const value = values.join(":").trim()
        if (key && value) {
          let type: FieldType = "text"
          if (isUUID(value)) {
            type = "uuid"
          } else if (isFilename(key)) {
            type = "filename"
          } else if (isFileSize(key)) {
            type = "fileSize"
          }
          newFields.push({
            key: key.trim(),
            value: value.trim(),
            type,
            label: `自定义字段 ${index + 1}`
          })
        }
      })

      if (newFields.length > 0) {
        setConfig((prevState) => {
          return {
            ...prevState,
            customFields: newFields.filter(
              (f) => f.key !== prevState.uploadField
            )
          }
        })
      }
    } catch (err) {
      console.error("读取剪贴板失败:", err)
    }
  }

  const clearCustomFields = () => {
    setConfig({
      ...config,
      customFields: []
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="bg-white rounded-2xl w-[800px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              上传配置
            </h2>
            <div className="flex items-center justify-between gap-6">
              <button
                type={"button"}
                className={`text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 font-medium hover:from-blue-600 hover:to-purple-600 active:scale-95 transition-all duration-150 flex items-center gap-1`}
                onClick={parseFromClipboard}>
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                从剪切板导入
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {/* 基础配置区域 */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-base font-medium text-gray-900 mb-3">
                基础配置
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    上传目标地址
                  </label>
                  <input
                    className="w-full px-3 py-1.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition duration-200"
                    placeholder="请输入上传接口地址"
                    value={config.uploadUrl}
                    onChange={(e) =>
                      setConfig({ ...config, uploadUrl: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    上传文件字段名
                  </label>
                  <input
                    className="w-full px-3 py-1.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition duration-200"
                    placeholder="请输入上传文件字段名"
                    value={config.uploadField}
                    onChange={(e) =>
                      setConfig({ ...config, uploadField: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    图片地址字段路径(从 response 中读取字段)
                    <span className="text-gray-500 text-xs pl-2">
                      请输入图片地址字段路径(支持 lodash.get 语法)，例如：
                      <span className="text-red-500">
                        data.url 或者 ['data', 'url']
                      </span>
                    </span>
                  </label>
                  <input
                    className="w-full px-3 py-1.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition duration-200"
                    placeholder="请输入图片地址字段路径"
                    value={config.imageFieldPath}
                    onChange={(e) =>
                      setConfig({ ...config, imageFieldPath: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    图片地址前缀
                    <span className="text-gray-500 text-xs pl-2">
                      将拼在图片地址字段前面
                    </span>
                  </label>
                  <input
                    className="w-full px-3 py-1.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition duration-200"
                    placeholder="请输入图片地址前缀"
                    value={config.imageUrlPrefix}
                    onChange={(e) =>
                      setConfig({ ...config, imageUrlPrefix: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SVG 处理地址
                  </label>
                  <input
                    className="w-full px-3 py-1.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition duration-200"
                    placeholder="请输入SVG处理地址"
                    value={config.svgActionEndpoint}
                    onChange={(e) =>
                      setConfig({ ...config, svgActionEndpoint: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* 自定义字段区域 */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-base font-medium text-gray-900 mb-3">
                自定义字段
              </h3>
              <div className="space-y-3">
                <div className="flex">
                  <button
                    onClick={parseFromClipboard}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-md border border-blue-200 text-sm font-medium text-blue-600 hover:from-blue-200 hover:to-purple-200 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-1.5">
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    从剪贴板导入 JSON 或配置文本
                  </button>
                </div>

                {config.customFields.map((field, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="px-3 py-1.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition duration-200"
                        placeholder="请输入字段名"
                        value={field.key}
                        onChange={(e) =>
                          updateField(index, { key: e.target.value })
                        }
                      />
                      <select
                        className="px-3 py-1.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition duration-200 cursor-pointer flex-1"
                        value={field.type}
                        onChange={(e) =>
                          updateField(index, {
                            type: e.target.value as FieldType
                          })
                        }>
                        <option value="text">文本</option>
                        <option value="uuid">UUID</option>
                        <option value="fileSize">文件大小</option>
                        <option value="filename">文件名</option>
                      </select>
                      {field.type === "text" && (
                        <input
                          className="flex-1 px-3 py-1.5 rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition duration-200"
                          placeholder="请输入字段值"
                          value={field.value}
                          onChange={(e) =>
                            updateField(index, { value: e.target.value })
                          }
                        />
                      )}
                      <button
                        onClick={() => removeField(index)}
                        className="px-2 py-1.5 text-red-500 hover:text-red-600 transition-colors duration-200">
                        删除
                      </button>
                    </div>
                  </motion.div>
                ))}
                <div className="flex gap-2">
                  <button
                    onClick={addCustomField}
                    className="flex-1 px-3 py-1.5 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-600 hover:border-gray-400 transition-colors duration-200 text-sm">
                    + 添加自定义字段
                  </button>
                  {config.customFields.length > 0 && (
                    <button
                      onClick={clearCustomFields}
                      className="flex-1 px-3 py-1.5 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-600 hover:border-gray-400 transition-colors duration-200 text-sm">
                      清空自定义字段
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
              取消
            </button>
            <button
              onClick={handleSave}
              className={`
                px-4 py-2 rounded-md text-white font-medium
                ${saved ? "bg-green-500" : "bg-blue-500 hover:bg-blue-600"}
                transition-colors duration-200
              `}>
              {saved ? "保存成功" : "保存配置"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
