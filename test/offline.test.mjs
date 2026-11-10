// Offline support is generated at build time: the service worker must precache
// every emitted file under the site base and refresh the cache when the build
// changes, otherwise a stale index.html is served forever.

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { resolveConfig } from 'vite'

import { offlinePlugin, serviceWorkerSource } from '../build/offline.js'

test('a relative base produces portable precache URLs', () => {
  const source = serviceWorkerSource(['index.html', 'assets/index-abc.js', 'assets/index-abc.css'], './')

  for (const url of ['"./"', '"./index.html"', '"./assets/index-abc.js"', '"./assets/index-abc.css"']) {
    assert.ok(source.includes(url), url)
  }
})

test('the cache version changes when the build changes', () => {
  const files = ['index.html', 'assets/index-abc.js']
  const before = serviceWorkerSource(files, './', 'old index')
  const after = serviceWorkerSource(files, './', 'new index')

  assert.notEqual(before, after)
})

test('the plugin emits sw.js for the bundle and public files under the resolved base', () => {
  const emitted = []
  const plugin = offlinePlugin(['convbin.svg'])
  plugin.configResolved({ publicDir: 'public', base: '/custom-site/' })
  const bundle = {
    'index.html': { type: 'asset', source: '<html></html>' },
    'assets/index-abc.js': { type: 'chunk' },
  }

  plugin.generateBundle.handler.call({ emitFile: (asset) => emitted.push(asset) }, {}, bundle)

  assert.equal(emitted.length, 1)
  assert.equal(emitted[0].fileName, 'sw.js')
  assert.ok(emitted[0].source.includes('/custom-site/assets/index-abc.js'))
  assert.ok(emitted[0].source.includes('/custom-site/convbin.svg'))
})

test('the resolved build base is relative so dist works from any path', async () => {
  const config = await resolveConfig({ configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)) }, 'build')

  assert.equal(config.base, './')
})

test('the cache version changes when a runtime-cached public file changes', () => {
  const publicDir = mkdtempSync(join(tmpdir(), 'convbin-offline-'))
  try {
    writeFileSync(join(publicDir, 'sample.bin'), 'first')
    const bundle = { 'index.html': { type: 'asset', source: '<html></html>' } }
    const emitSource = () => {
      const emitted = []
      const plugin = offlinePlugin()
      plugin.configResolved({ publicDir, base: './' })
      plugin.generateBundle.handler.call({ emitFile: (asset) => emitted.push(asset) }, {}, bundle)
      return emitted[0].source
    }

    const before = emitSource()
    writeFileSync(join(publicDir, 'sample.bin'), 'second')

    assert.notEqual(before, emitSource())
  } finally {
    rmSync(publicDir, { recursive: true, force: true })
  }
})

test('a missing public file fails the build instead of silently disabling offline', () => {
  const plugin = offlinePlugin(['samples/missing.bin'])
  plugin.configResolved({ publicDir: 'public', base: './' })
  const bundle = { 'index.html': { type: 'asset', source: '<html></html>' } }

  assert.throws(() => plugin.generateBundle.handler.call({ emitFile() {} }, {}, bundle), /missing\.bin/)
})
