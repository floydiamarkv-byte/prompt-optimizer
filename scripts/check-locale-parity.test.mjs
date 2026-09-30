import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  collectLeafPaths,
  diffLocaleShape,
  isPlainObject,
  isDirectExecution,
  loadTsDefaultExport,
} from './check-locale-parity.mjs'
import { toComparableFileUrl } from './direct-execution.mjs'

test('isPlainObject identifies plain objects only', () => {
  assert.equal(isPlainObject({ a: 1 }), true)
  assert.equal(isPlainObject(['a']), false)
  assert.equal(isPlainObject(null), false)
  assert.equal(isPlainObject('x'), false)
})

test('collectLeafPaths flattens nested message keys', () => {
  assert.deepEqual(
    collectLeafPaths({
      common: {
        save: 'Save',
        buttons: {
          cancel: 'Cancel',
        },
      },
    }),
    ['common.buttons.cancel', 'common.save'],
  )
})

test('diffLocaleShape reports missing, extra, and type mismatches', () => {
  const base = {
    common: {
      save: 'Save',
      nested: {
        title: 'Title',
      },
    },
  }

  const candidate = {
    common: {
      nested: 'wrong-shape',
      extra: 'Extra',
    },
  }

  assert.deepEqual(diffLocaleShape(base, candidate), {
    extra: ['common.extra'],
    missing: ['common.save'],
    mismatched: ['common.nested'],
  })
})

test('isDirectExecution works with Windows-style script paths', () => {
  assert.equal(
    isDirectExecution(
      'file:///C:/repo/SCRIPTS/check-locale-parity.mjs',
      'C:\\repo\\scripts\\check-locale-parity.mjs'
    ),
    true
  )
})

test('toComparableFileUrl normalizes Windows absolute paths for direct-execution checks', () => {
  assert.equal(typeof toComparableFileUrl, 'function')
  assert.equal(
    toComparableFileUrl('C:\\repo\\scripts\\check-locale-parity.mjs'),
    'file:///C:/repo/SCRIPTS/check-locale-parity.mjs'
  )
})

test('loadTsDefaultExport resolves relative imports for locale index modules', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'locale-parity-'))
  const depFile = path.join(tempDir, 'core.ts')
  const indexFile = path.join(tempDir, 'index.ts')

  fs.writeFileSync(
    depFile,
    [
      'const core = {',
      '  common: {',
      "    save: 'Save',",
      '  },',
      '} as const;',
      'export default core;',
      '',
    ].join('\n'),
    'utf8'
  )

  fs.writeFileSync(
    indexFile,
    [
      "import core from './core'",
      'const messages = {',
      '  ...core,',
      '} as const;',
      'export default messages;',
      '',
    ].join('\n'),
    'utf8'
  )

  const loaded = JSON.parse(JSON.stringify(loadTsDefaultExport(indexFile)))

  assert.deepEqual(loaded, {
    common: {
      save: 'Save',
    },
  })
})
