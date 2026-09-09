<h1>
<img align="center" width="32" src="https://github.com/imlinhanchao/tellory/blob/master/apps/web/public/logo.svg?raw=true">
<span>织言 · Tellory</span>
</h1>

**现代交互式小说创作、发布平台与轻量渲染引擎**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org/)
[![Monorepo](https://img.shields.io/badge/Monorepo-npm%20workspaces-orange.svg)](#-项目架构)

</div>

---

## 📖 项目简介

织言 (Tellory) 是一款专注于交互式小说的现代化创作与发布平台。项目基于类似 Twine Harlowe 的轻量纯文本 DSL 语法，包含底层的解析与渲染引擎 SDK、全功能的 Web 创作与阅读端、以及提供沙箱运行环境的服务端。

### 🌟 核心特性

- 纯文本故事 DSL：采用易读易写的文本标记语法，支持段落定义、变量运算、条件分支、宏指令以及 Markdown 格式扩展。
- 安全沙箱执行：
  - 前端支持基于白名单的 HTML 净化；
  - 服务端基于 `isolated-vm` V8 沙箱执行故事逻辑，结合 AES-256-GCM 加密状态，杜绝客户端篡改与安全隐患。
- 单文件独立导出：支持将故事剧本、引擎内核与存档状态打包为单文件 HTML，脱离服务器与网络即可在任意浏览器双击畅玩。
- 全流程创作平台：提供可视化与语法高亮编辑器、实时预览、历史回退、多档位本地与云端存档、故事社区发布与审核流。

---

## 🏗️ 项目架构

本项目采用 Monorepo（npm workspaces）结构管理：

```text
haide/
├── packages/
│   └── sdk/          # @tellory/sdk (tellory 核心解析与渲染引擎)
├── apps/
│   ├── web/          # 前端应用 (Vue 3 + Vite + Pinia + Tailwind / DaisyUI)
│   └── server/       # 后端服务 (NestJS + TypeORM + MySQL + isolated-vm)
├── release/          # 构建产物与发布打包目录
├── SYNTAX.md         # 故事 DSL 语法规范说明书
└── package.json      # Workspace 根配置与聚合脚本
```

### 渲染引擎 SDK (`packages/sdk`)
- 解析与 AST：手写递归下降解析器，支持词法扫描与语法树构建。
- 可插拔求值器 (Evaluator)：解耦逻辑执行与渲染，支持浏览器环境执行或服务端沙箱执行。
- HTML 安全渲染：自动移除 `on*` 事件属性及危险 URI 协议。
- 独立导出 (Standalone Export)：内置打包器，生成自包含的单 HTML 离线播放器。

### 前端 Web 端 (`apps/web`)
- 播放器模式：沉浸式阅读、段落分支跳转、变量监视浮窗、历史记录回退栈与存档管理。
- 编辑创作模式：分段落列表管理、CodeMirror 语法高亮与工具栏、快捷宏插入与即时预览。
- 社区与用户中心：作品广场、分类筛选、作品发布与管理、个人中心。

### 后端服务 (`apps/server`)
- NestJS 架构：模块化设计，集成 TypeORM (MySQL) 与 Swagger 接口文档。
- 安全运行时 (Story Runtime)：支持服务端受信执行段落效果，通过 AES-256-GCM 生成上下文 Dataset。
- 鉴权与审核：JWT 用户身份验证与故事审核流。

---

## 🚀 快速上手

### 环境要求

- Node.js >= 22.0.0
- npm >= 9.0.0 (支持 npm workspaces)
- MySQL >= 8.0 (运行后端服务时需要)

### 安装依赖

在项目根目录下安装所有依赖：

```bash
npm install
```

### 开发与调试

- 启动前端应用：
  ```bash
  npm run dev -w web
  ```
  默认访问地址：`http://localhost:5173`

- 启动后端服务：
  ```bash
  npm run start -w server
  ```
  默认 API 服务地址：`http://localhost:3000`，Swagger 文档：`http://localhost:3000/api-docs`

- 调试核心 SDK：
  ```bash
  npm run build:watch -w sdk
  ```

### 全局构建

在根目录下执行全量构建命令：

```bash
npm run build
```

构建产物在 `release/` 目录下，可以直接用于部署或发布。

---

## 📝 故事语法示例

织言使用简洁的纯文本 DSL（详细规范参见 [SYNTAX.md](SYNTAX.md)）：

```text
title: 森林奇遇
description: 一个简短的冒险示例
tags: 冒险, 奇幻

:: Start
你站在一个宁静的林间十字路口，四周树影婆娑。

(set: $health to 100)
(set: $gold to 10)

[[沿着鹅卵石路向东走|EastRoad]]
[[探索昏暗的西边密林|WestForest]]

:: EastRoad
你来到了一家林间小酒馆。
(set: $gold to $gold + 5)
当前金币：(print: $gold)

[[回到路口|Start]]

:: WestForest
密林深处有一只神秘的宝箱。
(if: $gold >= 10)[
  你用金币启动了机关，宝箱打开了！
](else:)[
  宝箱紧锁，似乎需要金币驱动机关。
]

[[返回十字路口|Start]]
```

---

## SKILL 辅助创作

[`tellory-writing`](skills/tellory-writing) 是织言提供的辅助创作工具，允许作者借助 AI 创作辅助进行互动故事的创作。

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源许可证。
