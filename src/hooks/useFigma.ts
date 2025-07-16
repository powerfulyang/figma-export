import {useEffect, useState} from "react";

export function useFigma() {
  const [isDevMode, setIsDevMode] = useState(() => {
    return !!window.figma
  })

  useEffect(() => {
    const interval = setInterval(() => {
      const isDev = !!window.figma
      setIsDevMode(isDev)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return isDevMode
}

