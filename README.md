# Zazu AI Assistant - VS Code Extension

![Version](https://img.shields.io/badge/version-0.4.2-green.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-^1.74.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

Fully automates the setup of the [Zazu AI Assistant](https://github.com/carlosmedinainditex/zazu-ai-assistant) project.

## ✨ Features

- ✅ **Automatic dependency installation** (Git, Python3, pip)
- ✅ **Repository cloning**
- ✅ **Python dependencies installation**
- ✅ **Environment configuration (.env)**
- ✅ **JIRA diagnostic test**
- ✅ **Status bar indicator**

## 🚀 Quick Start

### 1. Installation
```bash
code --install-extension zazu-ai-assistant-0.4.2.vsix
```

### 2. Configuration
**Cmd/Ctrl + ,** → Search "Zazu" → Configure:
- JIRA Server
- JIRA User
- JIRA Token

### 3. Automatic Setup
- Click **"Z"** in the status bar
- Select **"🚀 Complete Setup"**
- Done! 🎉

## 📋 Commands

| Command | Description |
|---------|-------------|
| `Zazu: Setup Project` | Complete automatic setup |
| `Zazu: Run Diagnosis` | JIRA connection test |
| `Zazu: Show Status Menu` | Main menu |
| `Zazu: Open Settings` | Open configuration |

## ⚙️ Configuration

```json
{
  "zazu.repositoryUrl": "https://github.com/carlosmedinainditex/zazu-ai-assistant.git",
  "zazu.projectPath": "${workspaceFolder}",
  "zazu.env.jiraServer": "https://jira.inditex.com/jira",
  "zazu.env.jiraUser": "your-username",
  "zazu.env.jiraToken": "your-token"
}
```

## 📊 Project Status

| Icon | Status |
|-------|--------|
| ✅ | All configured and working |
| 🔥 | JIRA connection error |
| 🔨 | Missing system dependencies |
| 🔧 | Missing JIRA credentials |
| ❌ | Project not found |
| ⚠️ | Incomplete configuration |

## 🌍 Multi-Platform Support

### Automatic Dependency Installation

The plugin detects and automatically installs missing dependencies:

**Windows:**
- Uses `winget` (recommended) or `chocolatey`
- Automatically adds Git and Python to PATH
- Suggests restarting VS Code to apply changes

**macOS:**
- Uses `brew` (requires Homebrew installed)
- Installs Python 3.12 and Git

**Linux:**
- Uses `apt-get`, `yum`, or `dnf` depending on distro
- Installs `python3`, `python3-pip`, and `git`

If you don't have a package manager, the plugin will show manual installation instructions.

## 🛠️ Development

```bash
npm install          # Install dependencies
npm run compile      # Compile
npm run watch        # Development mode
npm run package      # Create .vsix
```

## 📦 Project Structure

```
src/
├── extension.ts         # Entry point
├── types.ts            # TypeScript interfaces
├── config.ts           # Configuration management
├── system-utils.ts     # System utilities
├── project-manager.ts  # Git/Python operations
└── status-manager.ts   # UI state management
```

## 🐛 Troubleshooting

**Dependencies not installed:**
- The plugin installs them automatically
- On Windows, restart VS Code if suggested
- If it fails, install winget/chocolatey or manually

**JIRA connection error:**
- Verify credentials in Settings
- Check that JIRA server is accessible

**Python command not found:**
- The plugin tries to install it automatically
- If it fails, install Python 3.7+ manually
- Restart VS Code after installing

## 📄 License

MIT © Carlos Medina
