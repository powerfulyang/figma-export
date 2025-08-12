import { motion } from "framer-motion"
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
    <motion.button
      disabled={isLoading}
      className={`
        w-[32px] h-[32px] rounded-full flex items-center justify-center shadow-lg
        ${isLoading ? "bg-blue-300" : "bg-blue-500"} 
        ${className}
      `}
      whileHover={{ scale: 1.1, y: -2 }}
      whileTap={{ scale: 0.9 }}
      animate={{
        backgroundColor: isLoading ? "#93c5fd" : "#3b82f6",
        boxShadow: isLoading 
          ? "0 4px 6px -1px rgba(59, 130, 246, 0.3)" 
          : "0 10px 15px -3px rgba(59, 130, 246, 0.4)",
      }}
      transition={{ duration: 0.2 }}
      {...props}>
      <motion.div 
        className="w-5 h-5"
        animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
        transition={
          isLoading 
            ? { duration: 1, repeat: Infinity, ease: "linear" }
            : { duration: 0.3 }
        }>
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          key={isLoading ? 'loading' : 'default'}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}>
          {isLoading ? loadingIcon || defaultLoadingIcon : icon}
        </motion.svg>
      </motion.div>
    </motion.button>
  )
}
