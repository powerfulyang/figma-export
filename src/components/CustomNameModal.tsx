import { useEffect, useRef, useState } from "react"
import { filter, fromEvent, tap } from "rxjs"

interface CustomNameModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (name: string) => void
  defaultName?: string
}

export function CustomNameModal({
  isOpen,
  onClose,
  onConfirm,
  defaultName = "auto-icon"
}: CustomNameModalProps) {
  const [name, setName] = useState(defaultName)
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setName(defaultName)
      // 聚焦到输入框
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen, defaultName])

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
      onConfirm(name.trim())
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}>
      <div className="bg-white rounded-lg p-6 w-96 max-w-[90vw]">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            自定义图标名称
          </h3>
          <p className="text-sm text-gray-600">
            请输入您希望使用的图标名称
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            图标名称
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="请输入图标名称"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!name.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
            确认
          </button>
        </div>
      </div>
    </div>
  )
} 