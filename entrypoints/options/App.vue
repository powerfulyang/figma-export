<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { clearHistory, deleteHistoryRecord, getHistory } from '@/utils/storage'
import type { HistoryRecord } from '@/types/history'
import { Message, Modal } from '@arco-design/web-vue'

const historyList = ref<HistoryRecord[]>([])
const loading = ref(false)

function formatDate(timestamp: number) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
}

async function fetchHistory() {
  loading.value = true
  try {
    historyList.value = await getHistory()
  } finally {
    loading.value = false
  }
}

async function handleDelete(id: string) {
  await deleteHistoryRecord(id)
  await fetchHistory()
  Message.success('记录已删除')
}

async function handleClearAll() {
  Modal.warning({
    title: '确认要清空所有记录吗？',
    content: '清空后将无法恢复。',
    hideCancel: false,
    onOk: async () => {
      await clearHistory()
      await fetchHistory()
      Message.success('记录已清空')
    },
  })
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    Message.success('已复制到剪贴板')
  } catch (err) {
    Message.error('复制失败')
  }
}

onMounted(() => {
  fetchHistory()
})

const columns = [
  { title: '类型', dataIndex: 'type', slotName: 'type', width: 100 },
  { title: '名称', dataIndex: 'name', ellipsis: true, tooltip: true },
  { title: '结果', dataIndex: 'url', slotName: 'result', ellipsis: true },
  { title: '时间', dataIndex: 'timestamp', slotName: 'time', width: 180 },
  { title: '操作', slotName: 'actions', width: 100 },
]
</script>

<template>
  <div class="options-container p-6 max-w-1200px mx-auto">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold m-0 flex items-center gap-2">
        <div class="mdi:history text-3xl text-blue-600" />
        出口历史记录
      </h1>
      <a-space>
        <a-button @click="fetchHistory" :loading="loading">
          <template #icon><div class="mdi:refresh" /></template>
          刷新
        </a-button>
        <a-button type="primary" status="danger" @click="handleClearAll">
          <template #icon><div class="mdi:delete-sweep" /></template>
          清空全部
        </a-button>
      </a-space>
    </div>

    <a-card :bordered="false" class="shadow-sm">
      <a-table
        :data="historyList"
        :columns="columns"
        :loading="loading"
        :pagination="{ pageSize: 20 }"
      >
        <template #type="{ record }">
          <a-tag :color="record.type === 'upload' ? 'arcoblue' : 'green'">
            {{ record.type === 'upload' ? '文件上传' : 'Auto Icon' }}
          </a-tag>
        </template>

        <template #result="{ record }">
          <div class="flex items-center gap-2">
            <span class="truncate max-w-400px text-xs font-mono">{{ record.url }}</span>
            <a-button size="mini" type="text" @click="copyToClipboard(record.url)">
              <template #icon><div class="mdi:content-copy" /></template>
            </a-button>
            <a-link v-if="record.type === 'upload'" :href="record.url" target="_blank" size="small">
              查看
            </a-link>
          </div>
        </template>

        <template #time="{ record }">
          {{ formatDate(record.timestamp) }}
        </template>

        <template #actions="{ record }">
          <a-button size="small" type="text" status="danger" @click="handleDelete(record.id)">
            删除
          </a-button>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<style scoped>
.options-container {
  min-height: 100vh;
  background-color: var(--color-fill-1);
}

:deep(.arco-table-cell) {
  font-size: 13px;
}
</style>
