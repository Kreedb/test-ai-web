<script setup>
import { formatBytes } from '@/lib/format'

const props = defineProps({
  dragging: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  maxInputBytes: { type: Number, required: true },
  maxTotalBytes: { type: Number, required: true },
})

const emit = defineEmits(['files', 'update:dragging'])

function onDrop(event) {
  emit('update:dragging', false)
  if (props.disabled) return
  emit('files', event.dataTransfer?.files)
}

function onFileChange(event) {
  if (!props.disabled) emit('files', event.target.files)
  event.target.value = ''
}
</script>

<template>
  <label
    class="drop-zone"
    :class="{ dragging: dragging && !disabled }"
    :aria-disabled="disabled"
    @dragover.prevent="emit('update:dragging', !disabled)"
    @dragleave.prevent="emit('update:dragging', false)"
    @drop.prevent="onDrop"
  >
    <input
      type="file"
      multiple
      :disabled="disabled"
      accept=".PcbDoc,.SchDoc,.pcbdoc,.schdoc,.PrjPcb,.prjpcb,.dsn,.ses,.asc,.brd,.sch,.edif,.zip"
      aria-label="选择 EDA 工程文件或 ZIP 压缩包"
      aria-describedby="convert-drop-hint"
      @change="onFileChange"
    />
    <span class="drop-icon" aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" focusable="false">
        <path d="m8 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l8-8" />
        <path d="m6 14 8-8" />
      </svg>
    </span>
    <span class="drop-title">拖入工程文件或 ZIP，或点击选择</span>
    <span id="convert-drop-hint" class="drop-hint"> 可多选 · 单个文件上限 {{ formatBytes(maxInputBytes) }} · 合计上限 {{ formatBytes(maxTotalBytes) }} </span>
  </label>

  <details class="reference-section">
    <summary class="reference-summary">文件格式与导入说明</summary>
    <div class="reference-body">
      <p class="muted small">支持 Altium .PcbDoc / .SchDoc、Specctra .dsn / .ses、EAGLE XML .brd / .sch 与 PADS Layout ASCII .asc。一次可选择整个工程，但请勿混选不同来源的设计。</p>
      <p class="muted small">ZIP 会在浏览器内解开，仅保留可识别的设计文件，跳过的条目会显示提示。解压后的文件也受上述大小限制。工程侧文件（如 .PrjPcb）会在列表中标为忽略，不参与转换。</p>
    </div>
  </details>
</template>
