import { AnimatePresence, motion } from "framer-motion"
import React, { useEffect, useRef, useState } from "react"
import { filter, fromEvent, tap } from "rxjs"

interface CustomNameModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (options: {
    name: string
    withSize: boolean
    withDiv: boolean
  }) => void
  defaultName?: string
}

export function CustomNameModal({
  isOpen,
  onClose,
  onConfirm,
  defaultName = "auto-icon"
}: CustomNameModalProps) {
  // 使用静态变量保留上次的输入值和选项状态
  const [name, setName] = useState(defaultName)
  const [withSize, setWithSize] = useState(false)
  const [withDiv, setWithDiv] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // 静态变量用于保存状态
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // 只在第一次打开时设置默认值，之后保留上次的值
      if (!initialized) {
        setName(defaultName)
        setInitialized(true)
      }
      // 聚焦到输入框
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen, defaultName, initialized])

  // 按 ESC 关闭弹窗
  useEffect(() => {
    if (!isOpen) return

    const subscription = fromEvent<KeyboardEvent>(document, "keydown")
      .pipe(
        filter((event) => event.key === "Escape"),
        tap((event) => event.preventDefault())
      )
      .subscribe(() => {
        onClose()
      })

    return () => {
      subscription.unsubscribe()
    }
  }, [isOpen, onClose])

  // 按 Enter 确认
  useEffect(() => {
    if (!isOpen) return

    const subscription = fromEvent<KeyboardEvent>(inputRef.current, "keydown")
      .pipe(
        filter((event) => event.key === "Enter"),
        tap((event) => event.preventDefault())
      )
      .subscribe(() => {
        handleConfirm()
      })

    return () => {
      subscription.unsubscribe()
    }
  }, [isOpen, name])

  // 点击遮罩层关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm({
        name: name.trim(),
        withSize,
        withDiv
      })
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={modalRef}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}>
          <motion.div
            className="bg-white rounded-2xl p-6 w-96 max-w-[90vw] shadow-2xl border border-gray-100"
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            onClick={(e) => e.stopPropagation()}>
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}>
              <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
                自定义图标名称
              </h3>
              <p className="text-sm text-gray-600">
                请输入您希望使用的图标名称
              </p>
            </motion.div>

            <motion.div
              className="mb-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                图标名称
              </label>
              <motion.input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="请输入图标名称"
                whileFocus={{ scale: 1.02 }}
              />
            </motion.div>

            <motion.div
              className="mb-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                选项设置
              </label>
              <div className="space-y-3">
                <motion.label
                  className="flex items-center cursor-pointer"
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}>
                  <input
                    type="checkbox"
                    checked={withSize}
                    onChange={(e) => setWithSize(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">带大小属性</span>
                </motion.label>
                <motion.label
                  className="flex items-center cursor-pointer"
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}>
                  <input
                    type="checkbox"
                    checked={withDiv}
                    onChange={(e) => setWithDiv(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700">
                    包装在 div 中
                  </span>
                </motion.label>
              </div>
            </motion.div>

            <motion.div
              className="flex justify-end gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}>
              <motion.button
                onClick={onClose}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors rounded-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}>
                取消
              </motion.button>
              <motion.button
                onClick={handleConfirm}
                disabled={!name.trim()}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}>
                确认
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
