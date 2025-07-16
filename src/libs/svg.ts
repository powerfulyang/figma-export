/**
 * 检查SVG字符串是否包含白色
 */
export function hasWhiteComponent(svgString: string): boolean {
  return (
    (svgString || "").includes('fill="white"') ||
    (svgString || "").includes('fill="#fff"') ||
    (svgString || "").includes('fill="#ffffff"') ||
    (svgString || "").includes('stroke="white"') ||
    (svgString || "").includes('stroke="#fff"') ||
    (svgString || "").includes('stroke="#ffffff"')
  )
}
