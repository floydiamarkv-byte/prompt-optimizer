import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import { toComparableFileUrl } from './direct-execution.mjs'

const ALLOWED_PREFIXES = [
  'docs/',
  'mkdocs/',
  'tests/',
  'packages/ui/tests/',
  'packages/core/tests/',
  'packages/web/tests/',
  'packages/ui/src/i18n/',
  'packages/core/src/services/template/default-templates/',
  'packages/ui/src/docs/',
  'packages/ui/src/examples/',
]

const TARGET_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.vue', '.json', '.yml', '.yaml'])
const ENFORCED_TARGETS = [
  'package.json',
  'packages/ui/package.json',
  'packages/core/src/services/adapters/',
  'packages/core/src/services/DATA/',
  'packages/core/src/services/favorite/',
  'packages/core/src/services/storage/dexieStorageProvider.ts',
  'packages/core/src/services/storage/fileStorageProvider.ts',
  'packages/core/src/services/image/adapters/registry.ts',
  'packages/core/src/services/llm/adapters/registry.ts',
  'packages/core/src/services/prompt/service.ts',
  'packages/core/src/services/template/electron-language-proxy.ts',
  'packages/core/src/services/template/languageService.ts',
  'packages/core/src/services/template/manager.ts',
  'packages/core/src/services/template/processor.ts',
  'packages/core/src/services/template/static-loader.ts',
  'packages/core/src/services/variable-extraction/service.ts',
  'packages/core/src/services/variable-value-generation/service.ts',
  'packages/mcp-server/src/adapters/error-handler.ts',
  'packages/mcp-server/src/adapters/parameter-adapter.ts',
  'packages/mcp-server/src/config/templates.ts',
  'packages/mcp-server/src/index.ts',
  'packages/ui/src/components/CategoryManager.vue',
  'packages/ui/src/components/CategoryTreeSelect.vue',
  'packages/ui/src/components/DataManager.vue',
  'packages/ui/src/components/TestResultSection.vue',
  'packages/ui/src/components/evaluation/compare-ui.ts',
  'packages/ui/src/components/FavoriteListItem.vue',
  'packages/ui/src/components/image-mode/imageText2ImageEvaluation.ts',
  'packages/ui/src/components/image-mode/ImageTokenUsage.vue',
  'packages/ui/src/config/naive-theme.ts',
  'packages/ui/src/components/OutputDisplay.vue',
  'packages/ui/src/components/OutputDisplayFullscreen.vue',
  'packages/ui/src/components/PromptPanel.vue',
  'packages/ui/src/components/PromptGardenFavoritePreviewPanel.vue',
  'packages/ui/src/components/SaveFavoriteDialog.vue',
  'packages/ui/src/components/TagManager.vue',
  'packages/ui/src/components/TemplateManager.vue',
  'packages/ui/src/components/TemplateSelect.vue',
  'packages/ui/src/components/TestAreaPanel.vue',
  'packages/ui/src/components/TextModelEditModal.vue',
  'packages/ui/src/components/image-mode/ImageMultiImageWorkspace.vue',
  'packages/ui/src/components/app-layout/PromptOptimizerApp.vue',
  'packages/ui/src/components/context-mode/ContextSystemWorkspace.vue',
  'packages/ui/src/components/context-mode/ContextUserTestPanel.vue',
  'packages/ui/src/components/context-mode/ConversationTestPanel.vue',
  'packages/ui/src/composables/app/useAppFavorite.ts',
  'packages/ui/src/composables/app/useAppPromptGardenImport.ts',
  'packages/ui/src/composables/mode/useBasicSubMode.ts',
  'packages/ui/src/composables/mode/useImageSubMode.ts',
  'packages/ui/src/composables/mode/useProSubMode.ts',
  'packages/ui/src/composables/accessibility/useAccessibilityTesting.ts',
  'packages/ui/src/composables/accessibility/useFocusManager.ts',
  'packages/ui/src/composables/context/useContextEditor.ts',
  'packages/ui/src/composables/context/useContextManagement.ts',
  'packages/ui/src/composables/app/useAppHistoryRestore.ts',
  'packages/ui/src/composables/model/',
  'packages/ui/src/composables/prompt/useContextUserOptimization.ts',
  'packages/ui/src/composables/prompt/useConversationOptimization.ts',
  'packages/ui/src/composables/prompt/useEvaluationHandler.ts',
  'packages/ui/src/composables/prompt/useEvaluationContext.ts',
  'packages/ui/src/composables/performance/usePerformanceMonitor.ts',
  'packages/ui/src/composables/prompt/usePromptHistory.ts',
  'packages/ui/src/composables/prompt/usePromptOptimizer.ts',
  'packages/ui/src/composables/prompt/usePromptTester.ts',
  'packages/ui/src/composables/prompt/useVariableExtraction.ts',
  'packages/ui/src/composables/session/useSessionRestoreCoordinator.ts',
  'packages/ui/src/composables/system/useAppInitializer.ts',
  'packages/ui/src/composables/ui/useResponsiveTestLayout.ts',
  'packages/ui/src/composables/ui/useTestModeConfig.ts',
  'packages/ui/src/composables/workspaces/useBasicWorkspaceLogic.ts',
  'packages/ui/src/components/variable-extraction/VariableAwareInput.vue',
  'packages/ui/src/components/variable-extraction/useTextSelection.ts',
  'packages/ui/src/components/variable/VariableImporter.vue',
  'packages/ui/src/router/guards.ts',
  'packages/ui/src/services/EnhancedTemplateProcessor.ts',
  'packages/ui/src/stores/session/useImageMultiImageSession.ts',
  'packages/ui/src/stores/session/useBasicSystemSession.ts',
  'packages/ui/src/stores/session/useBasicUserSession.ts',
  'packages/ui/src/stores/session/useProMultiMessageSession.ts',
  'packages/ui/src/stores/session/useProVariableSession.ts',
  'packages/ui/src/stores/session/useImageText2ImageSession.ts',
  'packages/ui/src/stores/session/useImageImage2ImageSession.ts',
  'packages/ui/src/stores/session/useSessionManager.ts',
  'packages/ui/src/stores/settings/useGlobalSettings.ts',
  'packages/ui/src/composables/variable/',
]

export function containsChinese(text) {
  return /[\u3400-\u9FFF]/u.test(text)
}

export function shouldIgnoreLine(line) {
  const trimmed = line.trim()
  return (
    trimmed.length === 0 ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('*/')
  )
}

function isAllowedChineseRuntimeLine(filePath, line) {
  const normalized = filePath.replace(/\\/g, '/')
  const trimmed = line.trim()

  if (
    (normalized === 'packages/core/src/services/template/languageService.ts' ||
      normalized === 'packages/core/src/services/template/electron-language-proxy.ts') &&
    trimmed === "return '中文';"
  ) {
    return true
  }

  return false
}

export function isAllowedPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  return ALLOWED_PREFIXES.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix))
}

export function shouldScanPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  const extension = path.extname(normalized)

  if (!TARGET_EXTENSIONS.has(extension)) {
    return false
  }

  return ENFORCED_TARGETS.some((target) =>
    target.endsWith('/') ? normalized.startsWith(target) : normalized === target
  )
}

function stripCommentsFromLine(line, state) {
  let result = ''
  let quote = state.quote

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (state.inHtmlComment) {
      if (line.slice(index, index + 3) === '-->') {
        state.inHtmlComment = false
        index += 2
      }
      continue
    }

    if (state.inBlockComment) {
      if (char === '*' && next === '/') {
        state.inBlockComment = false
        index += 1
      }
      continue
    }

    if (quote) {
      result += char
      if (char === '\\') {
        const escaped = line[index + 1]
        if (escaped !== undefined) {
          result += escaped
          index += 1
        }
        continue
      }
      if (char === quote) {
        quote = null
      }
      continue
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char
      result += char
      continue
    }

    if (char === '/' && next === '*') {
      state.inBlockComment = true
      index += 1
      continue
    }

    if (char === '/' && next === '/') {
      break
    }

    if (char === '<' && line.slice(index, index + 4) === '<!--') {
      state.inHtmlComment = true
      index += 3
      continue
    }

    result += char
  }

  state.quote = quote
  return result
}

function getTrackedFiles() {
  const output = execFileSync('git', ['ls-files'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  })

  return output
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter((filePath) => shouldScanPath(filePath))
}

export function findChineseViolations(contents, filePath) {
  const lines = contents.split(/\r?\n/)
  const state = { inBlockComment: false, inHtmlComment: false, quote: null }
  const violations = []

  lines.forEach((line, index) => {
    if (shouldIgnoreLine(line)) {
      return
    }

    const stripped = stripCommentsFromLine(line, state)
    if (isAllowedChineseRuntimeLine(filePath, stripped)) {
      return
    }
    if (containsChinese(stripped)) {
      violations.push({
        file: filePath,
        line: index + 1,
        text: line.trim(),
      })
    }
  })

  return violations
}

function scanFile(filePath) {
  const contents = fs.readFileSync(path.join(process.cwd(), filePath), 'utf8')
  return findChineseViolations(contents, filePath)
}

export function isDirectExecution(importMetaUrl, argv1) {
  if (!argv1) {
    return false
  }

  return importMetaUrl === toComparableFileUrl(argv1)
}

function main() {
  const violations = getTrackedFiles()
    .filter((filePath) => !isAllowedPath(filePath))
    .flatMap((filePath) => scanFile(filePath))

  if (violations.length === 0) {
    console.log('[no-chinese-runtime] No disallowed Chinese runtime strings found')
    return
  }

  console.error('[no-chinese-runtime] Disallowed Chinese runtime strings detected:')
  violations.forEach((entry) => {
    console.error(`  - ${entry.file}:${entry.line} ${entry.text}`)
  })
  process.exitCode = 1
}

if (isDirectExecution(import.meta.url, process.argv[1])) {
  main()
}
