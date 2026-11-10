<script setup>
import { nextTick, ref, shallowRef } from 'vue'

import { queueFiles, resolveTool } from '@/lib/workspace'
import { routeHref, toolRoutes } from '@/routes'

const prompt = ref('')
const selectedTool = ref('auto')
const attachments = shallowRef([])
const taskInput = ref(null)
const dragging = ref(false)
const composing = ref(false)
const feedback = ref('')
const feedbackError = ref(false)
let dragDepth = 0

const taskExamples = {
  parser: { prompt: '解析 EEPROM 文件并导出 ESI XML', description: '读取 .bin，检查并编辑 EEPROM' },
  replay: { prompt: '回放机器人 bag，查看关节和 IMU', description: '查看机器人姿态与数据时间线' },
  convert: { prompt: '把 EDA 设计文件转换为 KiCad', description: '转换电路设计，检查兼容性' },
}
const suggestions = toolRoutes.filter((route) => taskExamples[route.id]).map((route) => ({ ...route, ...taskExamples[route.id] }))

function clearFeedback() {
  feedback.value = ''
  feedbackError.value = false
}

function addFiles(fileList) {
  const files = Array.from(fileList || [])
  if (!files.length) return
  attachments.value = [...attachments.value, ...files]
  feedbackError.value = false
  feedback.value = `已添加 ${files.length} 个本地文件，打开工具后在浏览器内处理。`
}

function pickFiles(event) {
  addFiles(event.target.files)
  event.target.value = ''
}

function removeFile(index) {
  const file = attachments.value[index]
  attachments.value = attachments.value.filter((_file, position) => position !== index)
  feedbackError.value = false
  feedback.value = `已移除 ${file.name}。`
  nextTick(() => taskInput.value?.focus())
}

function isFileDrag(event) {
  return Array.from(event.dataTransfer?.types || []).includes('Files')
}

function dragEnter(event) {
  if (!isFileDrag(event)) return
  event.preventDefault()
  dragDepth += 1
  dragging.value = true
}

function dragOver(event) {
  if (!isFileDrag(event)) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'copy'
}

function dragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (!dragDepth) dragging.value = false
}

function dropFiles(event) {
  dragDepth = 0
  dragging.value = false
  if (!event.dataTransfer?.files.length) return
  event.preventDefault()
  addFiles(event.dataTransfer.files)
}

function primeTask(suggestion) {
  prompt.value = suggestion.prompt
  selectedTool.value = 'auto'
  feedbackError.value = false
  feedback.value = `已填入${suggestion.label}任务。可修改描述或添加文件，按 Enter 自动匹配工具。`
  nextTick(() => taskInput.value?.focus())
}

function submitTask() {
  clearFeedback()
  if (!prompt.value.trim() && !attachments.value.length && selectedTool.value === 'auto') {
    feedbackError.value = true
    feedback.value = '请先描述任务、添加本地文件，或选择一个工具。'
    taskInput.value?.focus()
    return
  }

  const id = selectedTool.value === 'auto' ? resolveTool(prompt.value, attachments.value) : selectedTool.value
  const route = toolRoutes.find((candidate) => candidate.id === id)
  if (!route) {
    feedbackError.value = true
    feedback.value = '暂时无法确定工具。请描述 EEPROM 解析、机器人回放或 EDA 转换，也可以直接选择工具。'
    taskInput.value?.focus()
    return
  }

  queueFiles(id, attachments.value)
  window.location.hash = routeHref(`/${id}`)
}

function handleInputKeydown(event) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || composing.value || event.keyCode === 229) return
  event.preventDefault()
  submitTask()
}
</script>

<template>
  <main class="app-main home-main">
    <section class="home-welcome" aria-labelledby="welcome-title">
      <svg class="welcome-mark" width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
        <path d="M24 7v34M7 24h34M12 12l24 24m0-24L12 36M17 8l14 32M8 17l32 14M31 8 17 40M8 31l32-14" />
      </svg>
      <h1 id="welcome-title">今天，想处理什么？</h1>
      <p>从一个文件、一项任务开始。解析、回放与转换，都在本地完成。</p>
    </section>

    <form class="task-composer" :class="{ dragging }" aria-label="本地文件处理任务" @submit.prevent="submitTask" @dragenter="dragEnter" @dragover="dragOver" @dragleave="dragLeave" @drop="dropFiles">
      <label class="composer-label" for="workspace-task">描述你的任务</label>
      <textarea
        id="workspace-task"
        ref="taskInput"
        v-model="prompt"
        class="task-input"
        rows="3"
        placeholder="例如：解析 EEPROM，或把电路设计转为 KiCad…"
        aria-describedby="composer-note composer-feedback"
        :aria-invalid="feedbackError ? 'true' : undefined"
        @input="clearFeedback"
        @keydown="handleInputKeydown"
        @compositionstart="composing = true"
        @compositionend="composing = false"
      />

      <ul v-if="attachments.length" class="attachment-list" aria-label="已选择的本地文件">
        <li v-for="(file, index) in attachments" :key="index" class="attachment-chip">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z" />
            <path d="M14 3v6h6" />
          </svg>
          <span :title="file.name">{{ file.name }}</span>
          <button type="button" :aria-label="`移除 ${file.name}`" :title="`移除 ${file.name}`" @click="removeFile(index)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
              <path d="m6 6 12 12M6 18 18 6" />
            </svg>
          </button>
        </li>
      </ul>

      <div class="composer-toolbar">
        <label class="attachment-button" for="workspace-files" title="添加本地文件，也可以拖入此处">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m8 12 6-6a3 3 0 0 1 4.2 4.2l-8 8a4.5 4.5 0 0 1-6.4-6.4l8-8" />
          </svg>
          <span>添加文件</span>
          <input id="workspace-files" class="attachment-input" type="file" multiple @change="pickFiles" />
        </label>

        <select id="workspace-tool" v-model="selectedTool" class="tool-select" aria-label="选择处理工具" @change="clearFeedback">
          <option value="auto">自动匹配工具</option>
          <option v-for="route in toolRoutes" :key="route.id" :value="route.id">{{ route.label }}</option>
        </select>

        <button class="send-button" type="submit" aria-label="打开工具" title="打开工具 · Enter">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 19V5m-6 6 6-6 6 6" />
          </svg>
        </button>
      </div>
    </form>

    <p id="composer-note" class="composer-note">这里只在本地匹配工具，不是 AI 对话；文件不会上传。Enter 打开工具，Shift + Enter 换行。</p>
    <p id="composer-feedback" class="composer-feedback" :class="{ 'is-error': feedbackError }" role="status" aria-live="polite" aria-atomic="true">{{ feedback }}</p>

    <section class="suggestion-grid" aria-label="试试这些任务">
      <button v-for="suggestion in suggestions" :key="suggestion.id" class="suggestion-card" type="button" @click="primeTask(suggestion)">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <template v-if="suggestion.id === 'parser'">
            <rect x="6" y="6" width="12" height="12" rx="2" />
            <path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4z" />
          </template>
          <template v-else-if="suggestion.id === 'replay'">
            <path d="M4 5v14h16M8 15l3-6 4 4 5-9" />
          </template>
          <template v-else>
            <path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" />
          </template>
        </svg>
        <span class="suggestion-title">{{ suggestion.tool.title }}</span>
        <span class="suggestion-description">{{ suggestion.description }}</span>
      </button>
    </section>
  </main>
</template>
