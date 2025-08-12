import axios from "axios"
import { motion } from "framer-motion"
import { get } from "lodash-es"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { v4 } from "uuid"

import { getUploadConfig, saveImage } from "~libs/storage"

interface UploadButtonProps {
  image: Uint8Array
  asset: SceneNode
}

export function UploadButton({ image, asset }: UploadButtonProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [success])

  const upload = async () => {
    setUploading(true)
    setProgress(0)
    setSuccess(false)

    try {
      // 获取配置的上传地址
      const uploadConfig = await getUploadConfig()
      if (!uploadConfig) {
        return toast.error("请先配置上传地址")
      }

      // 创建 FormData
      const formData = new FormData()
      const blob = new Blob([image], {
        type: "image/png"
      })
      formData.append(uploadConfig.uploadField, blob)

      for (const customField of uploadConfig.customFields) {
        let value = customField.value
        if (customField.type === "uuid") {
          value = v4()
        } else if (customField.type === "fileSize") {
          value = blob.size.toString()
        } else if (customField.type === "filename") {
          value = `${v4()}.png`
        }
        formData.append(customField.key, value)
      }

      const result = await axios.post(uploadConfig.uploadUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            setProgress(
              Math.round((progressEvent.loaded / progressEvent.total) * 100)
            )
          }
        }
      })

      const data = result.data
      let path = uploadConfig.imageFieldPath
      try {
        // 数组字符串尝试
        path = JSON.parse(uploadConfig.imageFieldPath)
      } catch (error) {
        // ignore
      }
      const imagePath = get(data, path)
      const imageUrl = `${uploadConfig.imageUrlPrefix}${imagePath}`
      // 保存上传记录
      await saveImage(asset, imageUrl)
      // 地址写入剪切板
      await navigator.clipboard.writeText(imageUrl)

      toast.success("上传成功")

      setSuccess(true)
    } catch (error) {
      console.error(error)
      toast.error(error.message || "上传失败")
    } finally {
      setUploading(false)
    }
  }

  return (
    <motion.button
      onClick={upload}
      disabled={uploading}
      className={`px-3 py-1 rounded-lg text-sm relative overflow-hidden ${
        success
          ? "bg-green-500 text-white hover:bg-green-600"
          : "bg-white/90 backdrop-blur-sm text-gray-800 hover:bg-white"
      } transition-colors duration-200 font-medium`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        backgroundColor: success ? "#10b981" : uploading ? "#3b82f6" : "rgba(255, 255, 255, 0.9)",
        color: success || uploading ? "#ffffff" : "#374151",
      }}
      transition={{ duration: 0.2 }}>
      {uploading ? (
        <>
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
          <motion.span 
            className="relative z-10"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}>
            上传中 {progress}%
          </motion.span>
        </>
      ) : (
        <motion.span 
          className="flex items-center justify-center gap-1"
          key={success ? 'success' : 'default'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}>
          {success && (
            <motion.svg 
              className="w-4 h-4" 
              viewBox="0 0 20 20" 
              fill="currentColor"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}>
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </motion.svg>
          )}
          <motion.span
            initial={{ opacity: 0, x: success ? -10 : 0 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: success ? 0.2 : 0, duration: 0.3 }}>
            {success ? "图片地址已复制" : "上传到 OSS"}
          </motion.span>
        </motion.span>
      )}
    </motion.button>
  )
}
