import test from 'node:test'
import assert from 'node:assert/strict'

import {
  containsChinese,
  findChineseViolations,
  isAllowedPath,
  isDirectExecution,
  shouldScanPath,
  shouldIgnoreLine,
} from './check-no-chinese-runtime.mjs'
import { toComparableFileUrl } from './direct-execution.mjs'

test('containsChinese detects Han characters', () => {
  assert.equal(containsChinese('English only'), false)
  assert.equal(containsChinese('默认上下文'), true)
})

test('shouldIgnoreLine skips comments but not runtime strings', () => {
  assert.equal(shouldIgnoreLine('// 中文注释'), true)
  assert.equal(shouldIgnoreLine('* 中文注释'), true)
  assert.equal(shouldIgnoreLine("const title = '默认上下文'"), false)
})

test('isAllowedPath respects allowlisted content assets', () => {
  assert.equal(isAllowedPath('docs/guide.md'), true)
  assert.equal(isAllowedPath('mkdocs/index.md'), true)
  assert.equal(isAllowedPath('packages/ui/src/i18n/locales/zh-CN.ts'), true)
  assert.equal(isAllowedPath('packages/core/src/services/template/default-templates/demo.ts'), true)
  assert.equal(isAllowedPath('packages/ui/src/components/FavoriteButton.vue'), false)
})

test('findChineseViolations reports runtime Chinese string literals in core files', () => {
  const violations = findChineseViolations(
    [
      "const provider = '提供商'",
      'const ok = true',
    ].join('\n'),
    'packages/core/src/services/adapters/demo.ts'
  )

  assert.equal(violations.length, 1)
  assert.equal(violations[0].line, 1)
  assert.match(violations[0].text, /提供商/)
})

test('findChineseViolations reports Chinese template literals but ignores comments', () => {
  const violations = findChineseViolations(
    [
      '// 动态模型加载失败（注释，应忽略）',
      'const message = `动态模型加载失败 (${providerId})`',
      '/** 文档注释应忽略 */',
    ].join('\n'),
    'packages/core/src/services/adapters/demo.ts'
  )

  assert.equal(violations.length, 1)
  assert.equal(violations[0].line, 2)
  assert.match(violations[0].text, /动态模型加载失败/)
})

test('findChineseViolations ignores multi-line HTML comments in Vue files', () => {
  const violations = findChineseViolations(
    [
      '<!--',
      'PromptOptimizerApp - 主应用组件',
      '-->',
      "const message = 'English only'",
    ].join('\n'),
    'packages/ui/src/components/app-layout/PromptOptimizerApp.vue'
  )

  assert.equal(violations.length, 0)
})

test('findChineseViolations allows localized language display names in template language services', () => {
  const violations = findChineseViolations(
    [
      "switch (language) {",
      "  case 'zh-CN':",
      "    return '中文';",
      "  case 'en-US':",
      "    return 'English';",
      '}',
    ].join('\n'),
    'packages/core/src/services/template/languageService.ts'
  )

  assert.equal(violations.length, 0)
})

test('isDirectExecution works with Windows-style script paths', () => {
  assert.equal(
    isDirectExecution(
      'file:///C:/repo/SCRIPTS/check-no-chinese-runtime.mjs',
      'C:\\repo\\scripts\\check-no-chinese-runtime.mjs'
    ),
    true
  )
})

test('toComparableFileUrl normalizes Windows absolute paths for direct-execution checks', () => {
  assert.equal(typeof toComparableFileUrl, 'function')
  assert.equal(
    toComparableFileUrl('C:\\repo\\scripts\\check-no-chinese-runtime.mjs'),
    'file:///C:/repo/SCRIPTS/check-no-chinese-runtime.mjs'
  )
})

test('shouldScanPath includes third-batch runtime guardrail targets', () => {
  assert.equal(
    shouldScanPath('packages/core/src/services/storage/dexieStorageProvider.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/core/src/services/storage/fileStorageProvider.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/system/useAppInitializer.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/context/useContextEditor.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/stores/session/useImageText2ImageSession.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/stores/session/useImageImage2ImageSession.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/stores/session/useSessionManager.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/stores/session/useImageMultiImageSession.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/app/useAppHistoryRestore.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/app/useAppFavorite.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/app/useAppPromptGardenImport.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/stores/session/useBasicSystemSession.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/stores/session/useBasicUserSession.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/stores/settings/useGlobalSettings.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/session/useSessionRestoreCoordinator.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/mode/useBasicSubMode.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/mode/useImageSubMode.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/mode/useProSubMode.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/accessibility/useAccessibilityTesting.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/core/src/services/template/static-loader.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/core/src/services/variable-value-generation/service.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/mcp-server/src/adapters/error-handler.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/mcp-server/src/adapters/parameter-adapter.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/mcp-server/src/config/templates.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/mcp-server/src/index.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/CategoryManager.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/CategoryTreeSelect.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/DataManager.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/TestResultSection.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/evaluation/compare-ui.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/image-mode/imageText2ImageEvaluation.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/OutputDisplay.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/OutputDisplayFullscreen.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/PromptPanel.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/PromptGardenFavoritePreviewPanel.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/SaveFavoriteDialog.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/TagManager.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/TemplateManager.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/TemplateSelect.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/TestAreaPanel.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/TextModelEditModal.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/app-layout/PromptOptimizerApp.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/context-mode/ContextSystemWorkspace.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/context-mode/ContextUserTestPanel.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/context-mode/ConversationTestPanel.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/prompt/useContextUserOptimization.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/prompt/useConversationOptimization.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/prompt/useEvaluationHandler.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/performance/usePerformanceMonitor.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/prompt/usePromptHistory.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/prompt/usePromptOptimizer.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/prompt/useEvaluationContext.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/image-mode/ImageTokenUsage.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/config/naive-theme.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/variable-extraction/VariableAwareInput.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/variable-extraction/useTextSelection.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/components/variable/VariableImporter.vue'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/composables/workspaces/useBasicWorkspaceLogic.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/services/EnhancedTemplateProcessor.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/router/guards.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/stores/session/useProMultiMessageSession.ts'),
    true
  )
  assert.equal(
    shouldScanPath('packages/ui/src/stores/session/useProVariableSession.ts'),
    true
  )
})
