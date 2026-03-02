export interface HistoryRecord {
  id: string
  type: 'upload' | 'auto-icon'
  name: string
  icon?: string
  url?: string // file url or icon code
  content?: string // original svg content for auto-icon or something else
  timestamp: number
}
