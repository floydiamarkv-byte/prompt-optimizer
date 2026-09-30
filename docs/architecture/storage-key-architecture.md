# 存储键架构设计

## 📋 概述

本文档详细说明了应用中存储键的两种用途及其关系，解决了数据导出不完整的架构问题。

## 🔍 存储键的两种用途

### 1. 存储层使用（物理存储键）

**用途：** 实际的数据存储操作（localStorage、Dexie、文件存储等）

#### PreferenceService管理的UI设置
```typescript
// PreferenceService添加 'pref:' 前缀
private readonly PREFIX = 'pref:';

// 逻辑键名 -> 物理存储键名
'app:settings:ui:theme-id' -> 'pref:app:settings:ui:theme-id'
'app:settings:ui:preferred-language' -> 'pref:app:settings:ui:preferred-language'
'app:selected-optimize-model' -> 'pref:app:selected-optimize-model'
'app:selected-test-model' -> 'pref:app:selected-test-model'
'app:selected-optimize-template' -> 'pref:app:selected-optimize-template'
'app:selected-user-optimize-template' -> 'pref:app:selected-user-optimize-template'
'app:selected-iterate-template' -> 'pref:app:selected-iterate-template'
```

#### 直接存储的数据
```typescript
// 核心服务直接使用存储，无前缀
'models'                                    // ModelManager
'user-templates'                           // TemplateManager
'prompt_history'                          // HistoryManager
```

### 2. 导入导出JSON键（逻辑键名）

**用途：** JSON数据交换格式，用于数据导入导出

```json
{
  "version": 1,
  "data": {
    "userSettings": {
      "app:settings:ui:theme-id": "dark",           // 逻辑键名
      "app:settings:ui:preferred-language": "zh-CN", // 逻辑键名
      "app:settings:ui:builtin-template-language": "zh-CN", // 现在也通过PreferenceService
      "app:selected-optimize-model": "gemini",
      "app:selected-test-model": "siliconflow",
      "app:selected-optimize-template": "general-optimize",
      "app:selected-user-optimize-template": "user-template-id",
      "app:selected-iterate-template": "iterate"
    },
    "models": [...],
    "userTemplates": [...],
    "history": [...]
  }
}
```

## ❌ 发现的架构问题

### 问题描述
DataManager在导出时直接使用逻辑键名查找存储，但实际存储的键名可能带有前缀，导致找不到数据。

### 问题根源
```typescript
// ❌ 原有的错误实现
for (const key of UI_SETTINGS_KEYS) {
  const value = await this.storage.getItem(key); // 查找 'app:settings:ui:theme-id'
  // 但实际存储的是 'pref:app:settings:ui:theme-id'
}
```

### 影响范围
- 用户导出的JSON只包含4个设置项而不是预期的8个
- 通过PreferenceService存储的UI设置无法导出
- 数据导入时可能无法正确恢复用户偏好

## ✅ 解决方案

### 架构改进
DataManager现在区分两种存储方式，使用正确的服务来获取数据：

```typescript
// 通过PreferenceService存储的设置键
const PREFERENCE_BASED_KEYS = [
  'app:settings:ui:theme-id',
  'app:settings:ui:preferred-language',
  'app:selected-optimize-model',
  'app:selected-test-model',
  'app:selected-optimize-template',
  'app:selected-user-optimize-template',
  'app:selected-iterate-template'
] as const;

// 直接存储的设置键
const DIRECT_STORAGE_KEYS = [
  'app:settings:ui:builtin-template-language',
] as const;
```

### 导出逻辑修复
```typescript
// ✅ 修复后的导出逻辑
// 导出通过PreferenceService存储的设置
for (const key of PREFERENCE_BASED_KEYS) {
  const value = await this.preferenceService.get(key, null);
  if (value !== null) {
    userSettings[key] = String(value);
  }
}

// 导出直接存储的设置
for (const key of DIRECT_STORAGE_KEYS) {
  const value = await this.storage.getItem(key);
  if (value !== null) {
    userSettings[key] = value;
  }
}
```

### 导入逻辑修复
```typescript
// ✅ 修复后的导入逻辑
if (PREFERENCE_BASED_KEYS.includes(normalizedKey as any)) {
  // 通过PreferenceService存储
  await this.preferenceService.set(normalizedKey, value);
} else if (DIRECT_STORAGE_KEYS.includes(normalizedKey as any)) {
  // 直接存储
  await this.storage.setItem(normalizedKey, value);
}
```

## 🏗️ 架构原则

### 1. 分层存储
- **PreferenceService层** - 管理用户偏好设置，添加前缀避免冲突
- **直接存储层** - 管理应用数据，使用原始键名

### 2. 键名映射
- **逻辑键名** - 用于业务逻辑和数据交换，保持语义清晰
- **物理键名** - 用于实际存储，可能包含前缀或其他修饰

### 3. 服务职责
- **PreferenceService** - 负责用户偏好的存储和检索
- **DataManager** - 负责数据的导入导出，知道如何正确获取各种数据
- **核心服务** - 负责业务数据的管理，使用适当的存储方式

## 📊 存储键分类

| 键名 | 存储方式 | 物理键名 | 用途 |
|------|----------|----------|------|
| `app:settings:ui:theme-id` | PreferenceService | `pref:app:settings:ui:theme-id` | 主题设置 |
| `app:settings:ui:preferred-language` | PreferenceService | `pref:app:settings:ui:preferred-language` | 界面语言 |
| `app:settings:ui:builtin-template-language` | PreferenceService | `pref:app:settings:ui:builtin-template-language` | 内置模板语言 |
| `app:selected-optimize-model` | PreferenceService | `pref:app:selected-optimize-model` | 优化模型选择 |
| `app:selected-test-model` | PreferenceService | `pref:app:selected-test-model` | 测试模型选择 |
| `app:selected-optimize-template` | PreferenceService | `pref:app:selected-optimize-template` | 系统优化模板 |
| `app:selected-user-optimize-template` | PreferenceService | `pref:app:selected-user-optimize-template` | 用户优化模板 |
| `app:selected-iterate-template` | PreferenceService | `pref:app:selected-iterate-template` | 迭代模板 |
| `models` | 直接存储 | `models` | 模型配置 |
| `user-templates` | 直接存储 | `user-templates` | 用户模板 |
| `prompt_history` | 直接存储 | `prompt_history` | 提示词历史 |

## 🔄 向后兼容性

### 键名转换
应用支持旧版本数据的导入，通过LEGACY_KEY_MAPPING自动转换：

```typescript
const LEGACY_KEY_MAPPING: Record<string, string> = {
  'theme-id': 'app:settings:ui:theme-id',
  'preferred-language': 'app:settings:ui:preferred-language',
  'builtin-template-language': 'app:settings:ui:builtin-template-language',
};
```

### 数据迁移
导入旧版本数据时，系统会：
1. 识别旧的键名格式
2. 转换为新的标准键名
3. 使用正确的存储方式保存
4. 在控制台显示转换信息

## 🚀 最佳实践

### 1. 新增存储键
- 使用统一的常量定义
- 明确存储方式（PreferenceService vs 直接存储）
- 更新DataManager的分类数组

### 2. 修改存储方式
- 考虑向后兼容性
- 更新导入导出逻辑
- 添加数据迁移逻辑

### 3. 测试验证
- 验证数据导出完整性
- 测试旧版本数据导入
- 检查存储键一致性

## 📝 相关文件

- **常量定义**: `packages/ui/src/constants/storage-keys.ts`
- **核心常量**: `packages/core/src/constants/storage-keys.ts`
- **数据管理**: `packages/core/src/services/DATA/manager.ts`
- **偏好服务**: `packages/core/src/services/preference/service.ts`
- **测试文档**: `docs/testing/ai-automation/storage-key-consistency/`
