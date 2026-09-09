# Tellory Writing

这是一个用于创作 [Tellory（织言）](https://story.adventext.fun) 互动故事的 AI 创作辅助 Skill。它集成了语法规范、叙事技艺指导、成稿自查清单以及结构与渲染验证工具，旨在帮助你创作出高质量、逻辑严密且符合 Tellory 语法的互动小说。

## 核心功能

- **语法与技艺指导**：提供 Tellory 宏语法速查与互动叙事设计原则。
- **成稿自查**：内置禁用词清单与 prose 检查脚本，确保文本自然、无模型腔。
- **结构与渲染验证**：
  - `audit.py`：审计故事结构（死链、孤立段、未初始化变量）。
  - `smoke.cjs`：基于真实 SDK 的多配置渲染测试，确保无渲染错误。
- **AI 创作 Prompt**：提供标准化的创作提示词，确保 AI 输出符合 Tellory 规范。

## 安装

```bash
npx skills add imlinhanchao/tellory
```

## 如何使用

1. **创作**：使用本 Skill 提供的 `Prompt.md` 作为 AI 创作的提示词，填入你的故事设定。
2. **自查与验证**：
   - 运行 `python3 scripts/audit.py <故事文件>` 检查结构。
   - 运行 `node scripts/smoke.cjs <故事文件>` 进行渲染测试。
3. **发布**：将生成的 Tellory 故事源码导入 [story.adventext.fun](https://story.adventext.fun) 进行预览与发布。

## AI 创作 Prompt

你也可以直接复制 [Prompt.md](Prompt.md) 的提示词直接创作你的故事。不过提示词受限于模型的理解与生成能力，可能需要根据实际输出进行调整。推荐使用 SKILL 进行创作。

## 参考

- 本 SKILL 参考于 @KKKKhazix 的 [human-writing](https://github.com/KKKKhazix/human-writing/) 进行制作。