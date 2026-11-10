<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import HomeWorkspace from '@/components/HomeWorkspace.vue'
import { useRoute } from '@/router'
import { routeFor, routeHref, toolRoutes } from '@/routes'

const path = useRoute()
const active = computed(() => routeFor(path.value))
const mobileQuery = window.matchMedia('(max-width: 800px)')
const isMobile = ref(mobileQuery.matches)
const sidebarOpen = ref(!isMobile.value)
const sidebar = ref(null)
const sidebarToggle = ref(null)
const sidebarClose = ref(null)
const homeVersion = ref(0)

function closeSidebar() {
  sidebarOpen.value = false
  nextTick(() => sidebarToggle.value?.focus())
}

function onNavigation() {
  if (isMobile.value && sidebarOpen.value) closeSidebar()
}

function newTask(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  homeVersion.value += 1
  onNavigation()
}

function updateViewport(event) {
  const focusWasInSidebar = sidebar.value?.contains(document.activeElement)
  isMobile.value = event.matches
  sidebarOpen.value = !event.matches
  if (event.matches && focusWasInSidebar) nextTick(() => sidebarToggle.value?.focus())
}

function handleDrawerKeydown(event) {
  if (!isMobile.value || !sidebarOpen.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closeSidebar()
    return
  }
  if (event.key !== 'Tab') return

  const controls = Array.from(sidebar.value?.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]') || [])
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (!first) {
    event.preventDefault()
    sidebar.value?.focus()
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if ((!event.shiftKey && document.activeElement === last) || !sidebar.value.contains(document.activeElement)) {
    event.preventDefault()
    first.focus()
  }
}

watch(sidebarOpen, (open) => {
  if (open && isMobile.value) nextTick(() => sidebarClose.value?.focus())
})

watch(path, onNavigation)

watch(
  () => isMobile.value && sidebarOpen.value,
  (open, _previous, onCleanup) => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    onCleanup(() => {
      document.body.style.overflow = previousOverflow
    })
  },
)

onMounted(() => {
  mobileQuery.addEventListener('change', updateViewport)
  document.addEventListener('keydown', handleDrawerKeydown)
})

onBeforeUnmount(() => {
  mobileQuery.removeEventListener('change', updateViewport)
  document.removeEventListener('keydown', handleDrawerKeydown)
})
</script>

<template>
  <div class="app" :class="sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'">
    <aside
      id="workspace-navigation"
      ref="sidebar"
      v-show="sidebarOpen"
      class="app-sidebar"
      :role="isMobile ? 'dialog' : undefined"
      :aria-modal="isMobile && sidebarOpen ? 'true' : undefined"
      :aria-hidden="!sidebarOpen ? 'true' : undefined"
      :inert="!sidebarOpen"
      aria-label="工作区导航"
      tabindex="-1"
    >
      <div class="sidebar-head">
        <a class="brand" :href="routeHref('/')" aria-label="convbin 首页" @click="onNavigation">
          <span class="brand-mark" aria-hidden="true">cb</span>
          <span>convbin</span>
        </a>
        <button ref="sidebarClose" class="icon-button sidebar-close" type="button" aria-label="收起侧边栏" title="收起侧边栏" @click="closeSidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16m7-11-3 3 3 3" />
          </svg>
        </button>
      </div>

      <a class="sidebar-new-task" :class="{ active: path === '/' }" :href="routeHref('/')" :aria-current="path === '/' ? 'page' : undefined" @click="newTask">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
        <span>新建任务</span>
      </a>

      <nav class="sidebar-nav" aria-label="本地工具">
        <span class="nav-label">工具</span>
        <a
          v-for="route in toolRoutes"
          :key="route.id"
          :href="routeHref(route.path)"
          :class="{ active: route.path === path }"
          :aria-current="route.path === path ? 'page' : undefined"
          @click="onNavigation"
        >
          <svg class="nav-icon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <template v-if="route.id === 'parser'">
              <rect x="6" y="6" width="12" height="12" rx="2" />
              <path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M10 10h4v4h-4z" />
            </template>
            <template v-else-if="route.id === 'replay'">
              <path d="M4 5v14h16M8 15l3-6 4 4 5-9" />
            </template>
            <template v-else-if="route.id === 'convert'">
              <path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" />
            </template>
            <template v-else>
              <rect x="4" y="4" width="16" height="16" rx="3" />
              <path d="M8 12h8m-4-4v8" />
            </template>
          </svg>
          <span>{{ route.label }}</span>
        </a>
      </nav>

      <div class="sidebar-footer">
        <p class="sidebar-note">文件留在你的浏览器，处理无需登录。</p>
        <a class="gh-link" href="https://github.com/Kreedb/test-ai-web" target="_blank" rel="noopener noreferrer">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path
              d="M9 19c-4 1-4-2-6-2m12 5v-4a3.5 3.5 0 0 0-1-2.7c3.3-.4 6.7-1.6 6.7-7.3A5.7 5.7 0 0 0 19.2 4a5.3 5.3 0 0 0-.1-4s-1.3-.4-4.1 1.5a14.5 14.5 0 0 0-7.4 0C4.8-.4 3.5 0 3.5 0A5.3 5.3 0 0 0 3.4 4 5.7 5.7 0 0 0 1.9 8c0 5.7 3.4 6.9 6.7 7.3A3.5 3.5 0 0 0 7.6 18v4"
              transform="translate(1 1) scale(.9)"
            />
          </svg>
          <span>GitHub 项目</span>
        </a>
      </div>
    </aside>

    <button v-if="isMobile && sidebarOpen" class="sidebar-backdrop" type="button" tabindex="-1" aria-label="关闭侧边栏" @click="closeSidebar" />

    <div class="app-content" :inert="isMobile && sidebarOpen">
      <header class="app-header">
        <button
          ref="sidebarToggle"
          class="icon-button sidebar-toggle"
          type="button"
          :aria-expanded="sidebarOpen"
          aria-controls="workspace-navigation"
          :aria-label="sidebarOpen ? '收起侧边栏' : '展开侧边栏'"
          :title="sidebarOpen ? '收起侧边栏' : '展开侧边栏'"
          @click="sidebarOpen = !sidebarOpen"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
        </button>
        <span class="page-context">{{ active?.label || '新建任务' }}</span>
        <span class="workspace-status">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
            <path d="m8.5 12 2.5 2.5 4.5-5" />
          </svg>
          <span>本地工作区</span>
        </span>
      </header>

      <component :is="active.component" v-if="active" />
      <HomeWorkspace v-else :key="homeVersion" />

      <footer class="app-footer">
        <span>convbin · 数据仅在浏览器本地处理，文件不会上传</span>
      </footer>
    </div>
  </div>
</template>
