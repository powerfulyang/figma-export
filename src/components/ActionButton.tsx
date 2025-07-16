import React, { useEffect, useState } from "react"

interface ActionButtonProps {
  onClick: () => Promise<void> | void
  className?: string
  text: string
  successText: string
  icon?: React.ReactNode
  successIcon?: React.ReactNode
}

export function ActionButton({
  onClick,
  className = "",
  text,
  successText,
  icon,
  successIcon = (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}: ActionButtonProps) {
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        setIsSuccess(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isSuccess])

  async function handleClick() {
    try {
      await onClick()
      setIsSuccess(true)
    } catch (error) {
      console.error("操作失败:", error)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSuccess}
      className={`
        transition-colors duration-200
        ${isSuccess ? "bg-green-50 text-green-600" : ""}
        ${className}
      `}>
      {isSuccess ? (
        <span className="flex items-center justify-center gap-1">
          {successIcon}
          {successText}
        </span>
      ) : (
        <span className="flex items-center justify-center gap-1">
          {icon}
          {text}
        </span>
      )}
    </button>
  )
}
