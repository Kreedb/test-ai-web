import assert from 'node:assert/strict'
import test from 'node:test'

import { queueFiles, resolveTool, takeQueuedFiles } from '../src/lib/workspace.js'

test('task descriptions select actual local tools', () => {
  assert.equal(resolveTool('解析 EEPROM 并导出 ESI XML'), 'parser')
  assert.equal(resolveTool('回放 ROS2 关节与 IMU'), 'replay')
  assert.equal(resolveTool('查看 IMU 波形'), 'replay')
  assert.equal(resolveTool('将 Altium 工程转换为 KiCad'), 'convert')
  assert.equal(resolveTool('hello'), null)
  assert.equal(resolveTool('combine some padding'), null)
  assert.equal(resolveTool(''), null)
})

test('attachments select tools without reading file contents', () => {
  for (const [name, id] of [
    ['drive.BIN', 'parser'],
    ['robot.bag.active', 'replay'],
    ['record.MCAP', 'replay'],
    ['record.db3', 'replay'],
    ['robot.urdf', 'replay'],
    ['trace.log', 'replay'],
    ['board.PcbDoc', 'convert'],
    ['board.brd', 'convert'],
    ['layout.asc', 'convert'],
  ]) {
    assert.equal(resolveTool('', [{ name }]), id, name)
  }
  assert.equal(resolveTool('', [{ name: 'project.zip' }]), null)
  assert.equal(resolveTool('转换为 KiCad', [{ name: 'project.zip' }]), 'convert')
  assert.equal(resolveTool('回放机器人', [{ name: 'robot.zip' }]), 'replay')
  assert.equal(resolveTool('', [{ name: 'report.pdf' }]), null)
})

test('ambiguous requests and multiple EEPROM dumps require an explicit choice', () => {
  assert.equal(resolveTool('EEPROM 和机器人回放'), null)
  assert.equal(resolveTool('转换为 KiCad', [{ name: 'record.bag' }]), null)
  assert.equal(resolveTool('', [{ name: 'drive.bin' }, { name: 'other.bin' }]), null)
  assert.equal(resolveTool('', [{ name: 'robot.bag' }, { name: 'board.sch' }]), null)
  assert.equal(resolveTool('', [{ name: 'robot.bag' }, { name: 'robot.urdf' }, { name: 'trace.log' }]), 'replay')
})

test('attachments are handed to the intended tool exactly once without persistence', () => {
  const file = new File(['sample'], 'drive.bin')
  const selected = [file]
  queueFiles('parser', selected)
  selected.length = 0
  assert.deepEqual(takeQueuedFiles('replay'), [])
  assert.deepEqual(takeQueuedFiles('parser'), [file])
  assert.deepEqual(takeQueuedFiles('parser'), [])
})

test('starting another task replaces abandoned attachments', () => {
  queueFiles('parser', [new File(['old'], 'old.bin')])
  const file = new File(['new'], 'new.bag')
  queueFiles('replay', [file])
  assert.deepEqual(takeQueuedFiles('parser'), [])
  assert.deepEqual(takeQueuedFiles('replay'), [file])
})
