<div align="center">
  <img src="https://img.shields.io/badge/Status-Beta-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Platform-Mac%20%7C%20Windows%20%7C%20Linux-green?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Built%20With-Electron%20%7C%20Node.js-yellow?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge" />

  <br /><br />

  <h1>🛡️ Token Saver</h1>
  <h3>Lighter Infrastructure for AI Coding Agents</h3>
  <p><b>Fewer tokens · Cleaner context · Controllable costs</b></p>

  <p>
    <a href="https://tokensaver.ir">🌐 Website</a> &nbsp;·&nbsp;
    <a href="https://tokensaver.ir/blog.html">📖 Blog</a> &nbsp;·&nbsp;
    <a href="https://t.me/m4tinbeigipv">💬 Telegram</a>
  </p>
</div>

---

## 💡 The Problem

AI coding agents (Claude Code, Cursor, Windsurf, Codex CLI, Gemini CLI) are getting smarter — but simultaneously falling into the trap of **Context Illusion** and **Exponential Token Usage**.

When you ask an agent to _"test and debug the project"_, instead of reading useful logs, it consumes **thousands of tokens on raw npm warnings, lockfiles, and minified outputs** — driving up your API bill and breaking model focus.

## 🚀 Solution: Token Saver

Token Saver is a **Local-First Context Engineering Tool** that sits between your editor/agent and the LLM provider. It:

- 🔧 **Installs compression rules** directly into your project (`.tokensaver/`, `.gitignore` patterns, AGENTS.md configs)
- 🔐 **Runs a local proxy** to strip noisy tokens *before* they hit the cloud
- 📊 **Monitors live** token consumption and savings per request
- 👻 **Works offline** — your code *never* leaves your machine

---

## ✨ Features

| Feature | Free | Pro |
|---|---|---|
| Automated tool installer | ✅ | ✅ |
| Context config generator (AGENTS.md, GEMINI.md) | ✅ | ✅ |
| Guest Mode (no login required) | ✅ | ✅ |
| Bilingual UI (English / Persian) | ✅ | ✅ |
| Live Token Monitor (Proxy) | ✅ | ✅ |
| Codebase Graph (code-graph-mcp) | ✅ (limited) | ✅ |
| Token Budget Guard | ❌ | ✅ |
| Long-term Agent Memory | ❌ | ✅ |
| Output Compression & Deduplication | ❌ | ✅ |
| Team Config Export | ❌ | ✅ |

---

## 🛠️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Desktop App (Electron)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  Project │  │ Questions│  │   Tool Installer │  │
│  │  Scanner │→ │ Wizard   │→ │  (curl, npm, git)│  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                                    ↓                 │
│                         ┌──────────────────┐        │
│                         │  Live Proxy 8080 │        │
│                         │  Token Monitor   │        │
│                         └──────────────────┘        │
└─────────────────────────────────────────────────────┘
          ↓ (Auth / Licenses / Notifications)
┌─────────────────────────────────────────────────────┐
│              Backend API (Node.js / JSON DB)         │
│  /api/auth   /api/tools   /admin   /api/notify       │
└─────────────────────────────────────────────────────┘
```

### Supported AI Agents
Claude Code · Cursor · Windsurf · Codex CLI · Gemini CLI · Aider · Roo Cline · VS Code Copilot

---

## 📦 Getting Started

### Prerequisites
- Node.js v18+
- Git

### 1. Clone & Install

```bash
git clone https://github.com/m4tinbeigi-official/tokensaver.git
cd tokensaver
```

### 2. Start the Backend

```bash
cd server
npm install
npm start
# Server: http://localhost:8080
# Admin:  http://localhost:8080/admin
```

### 3. Launch the Desktop App

```bash
cd desktop
npm install
npm start
```

---

## 🔒 Security & Privacy

> **Your code stays on your machine.** Token Saver's proxy processes everything locally. Only authentication tokens and license keys communicate with our servers. The codebase graph (code-graph-mcp) runs entirely via local MCP servers.

---

## 📄 License

The core installer and config generator are open-source. Pro token-saving algorithms (Budget Guard, Output Compression, Agent Memory) are unlocked via a license key available at [tokensaver.ir](https://tokensaver.ir).

---

<div align="center">
  <sub>Built with ❤️ for developers tired of high AI API bills · <a href="https://tokensaver.ir">tokensaver.ir</a></sub>
</div>
