import React, { type ButtonHTMLAttributes } from "react"

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  icon: React.ReactNode
  loadingIcon?: React.ReactNode
}

export function LoadingButton({
  isLoading,
  icon,
  loadingIcon,
  className = "",
  ...props
}: LoadingButtonProps) {
  const defaultLoadingIcon = (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  )

  return (
    <button
      disabled={isLoading}
      className={`
        w-[32px] h-[32px] rounded-full flex items-center justify-center shadow-lg
        ${isLoading ? "bg-blue-300" : "bg-blue-500"} 
        ${className}
      `}
      {...props}>
      <div className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor">
          {isLoading ? loadingIcon || defaultLoadingIcon : icon}
        </svg>
      </div>
    </button>
  )
}
