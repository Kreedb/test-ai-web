import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { DOMParser } from '@xmldom/xmldom'
import { createRenderer, nextTick, ref } from 'vue'
import { babelParse, compileScript, parse } from 'vue/compiler-sfc'

import { takeQueuedFiles } from '../src/lib/workspace.js'

globalThis.DOMParser = DOMParser

const toolRoutes = ['parser', 'replay', 'convert'].map((id) => ({ id, path: `/${id}`, label: id, tool: { title: id } }))
const modules = {
  '@/routes': { toolRoutes, routeHref: (path) => `#${path}`, routeFor: (path) => toolRoutes.find((route) => route.path === path) },
  '@/router': { useRoute: () => ref('/') },
}
// Render no template: Vue still owns the setup effect scope and unmount hooks.
const renderer = createRenderer({
  createComment: () => ({}),
  insert() {},
  remove() {},
  parentNode: () => null,
  nextSibling: () => null,
})

async function setupSfc(t, filename) {
  const { descriptor } = parse(await readFile(new URL(`../${filename}`, import.meta.url), 'utf8'), { filename })
  const compiled = compileScript({ ...descriptor, script: null }, { id: filename, genDefaultAs: 'component' })
  const events = { addEventListener() {}, removeEventListener() {} }
  const window = { location: { hash: '#/' }, matchMedia: () => ({ matches: true, ...events }) }
  const bindings = { window, document: { body: { style: { overflow: '' } }, ...events }, __env: { BASE_URL: '/' } }
  for (const { source, local, imported } of Object.values(compiled.imports)) {
    const module = source.endsWith('.vue') ? { default: {} } : modules[source] || (await import(source.startsWith('@/') ? new URL(`../src/${source.slice(2)}.js`, import.meta.url) : source))
    bindings[local] = imported === '*' ? module : module[imported]
  }
  // Adapt module imports and Vite's environment only; keep all setup logic real.
  let code = compiled.content
  for (const node of babelParse(code, { sourceType: 'module' }).program.body.reverse()) {
    if (node.type === 'ImportDeclaration') code = code.slice(0, node.start) + code.slice(node.end)
  }
  code = code.replaceAll('import.meta.env', '__env')
  const component = new Function(...Object.keys(bindings), `${code}\nreturn component`)(...Object.values(bindings))
  let state
  const app = renderer.createApp({
    setup(props, context) {
      state = component.setup(props, context)
      return () => null
    },
  })
  t.after(() => app.unmount())
  app.mount({})
  return { state, window }
}

test('editing a suggested task rematches tools while a manual selection still overrides', async (t) => {
  const { state, window } = await setupSfc(t, 'src/components/HomeWorkspace.vue')
  const parser = state.suggestions.find((suggestion) => suggestion.id === 'parser')
  const replayPrompt = '回放机器人 bag，查看关节和 IMU'

  state.primeTask(parser)
  state.prompt.value = replayPrompt
  state.clearFeedback()
  state.submitTask()
  assert.equal(window.location.hash, '#/replay')
  assert.equal(state.feedbackError.value, false)
  assert.deepEqual(takeQueuedFiles('replay'), [])

  state.primeTask(parser)
  state.selectedTool.value = 'parser'
  state.prompt.value = replayPrompt
  state.clearFeedback()
  state.submitTask()
  assert.equal(window.location.hash, '#/parser')
  assert.equal(state.selectedTool.value, 'parser')
  assert.deepEqual(takeQueuedFiles('parser'), [])
  await nextTick()
})

test('rejected EEPROM replacements preserve the loaded image, edits, and generated XML', async (t) => {
  const { state } = await setupSfc(t, 'src/pages/ParserPage.vue')
  const bytes = await readFile(new URL('../public/samples/limx-tron2.bin', import.meta.url))
  const file = new File([bytes], 'limx-tron2.bin')
  await state.handleFile(file)
  assert.equal(state.error.value, '')
  assert.ok(state.source.value)
  state.setName(state.model.general, 'deviceName', 'nameStringIndex', { target: { value: 'Edited Limx device' } })
  await nextTick()
  state.flushRegenerate()
  assert.equal(state.model.general.deviceName, 'Edited Limx device')
  assert.ok(state.output.value.xml.includes('Edited Limx device'))
  assert.ok(state.check.value.bytes, 'the real XML verifier recompiles the edited image')

  const source = state.source.value
  const output = state.output.value
  const model = JSON.stringify(state.model)
  const preserved = () => {
    assert.equal(state.source.value, source)
    assert.equal(JSON.stringify(state.model), model)
    assert.equal(state.output.value, output)
    assert.equal(state.fileName.value, 'limx-tron2.bin')
    assert.equal(state.busy.value, false)
  }

  state.handleFileSelection([file, new File([bytes], 'another.bin')])
  await nextTick()
  assert.match(state.error.value, /每次只能打开一个/)
  preserved()

  await state.handleFile(new File([bytes], 'invalid.txt'))
  assert.match(state.error.value, /仅支持 \.bin/)
  preserved()
})

test('modified new-task anchor clicks preserve the current draft and normal clicks reset it', async (t) => {
  const { state } = await setupSfc(t, 'src/App.vue')
  const click = { button: 0, defaultPrevented: false, preventDefault: () => assert.fail('keep native anchor navigation') }
  state.sidebarOpen.value = true
  await nextTick()

  for (const modifier of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { button: 2 }, { defaultPrevented: true }]) {
    state.newTask({ ...click, ...modifier })
    assert.equal(state.homeVersion.value, 0)
    assert.equal(state.sidebarOpen.value, true)
  }

  state.newTask(click)
  assert.equal(state.homeVersion.value, 1)
  assert.equal(state.sidebarOpen.value, false)
  await nextTick()
})
