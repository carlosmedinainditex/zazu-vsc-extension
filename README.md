# Zazu AI Assistant Extension

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.1.1-green.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-^1.74.0-blue.svg)

A simplified VS Code extension that automates the setup of the **Zazu AI Assistant** project.

## 🎯 Purpose

This extension simplifies the setup of the [Zazu AI Assistant](https://github.com/carlosmedinainditex/zazu-ai-assistant) project by:

1. **Cloning** the remote repository
2. **Installing** Python dependencies 
3. **Running** basic tests to verify setup

## ✨ Features

### 🎮 Simple Status Menu
- **"Z" icon** in status bar with quick menu
- **Visual status**: ✅ Ready, 🔥 Error, 🔄 Unknown
- **Easy access** to main functions

### 🔧 Automated Setup
- ✅ **Dependency check** (Python3, pip3, git)
- ✅ **Repository cloning** to workspace
- ✅ **Python dependency installation**
- ✅ **JIRA environment configuration**
- ✅ **Basic connection test**

## 🚀 Quick Usage

### 1️⃣ Installation
```bash
code --install-extension zazu-ai-assistant-0.1.1.vsix
```

### 2️⃣ Configuration
1. **Cmd/Ctrl + ,** → Search "Zazu"
2. **Configure**: Repository URL, Project Path, JIRA credentials

### 3️⃣ Setup
- **Click "Z"** in status bar
- **Select "🚀 Complete Setup"**
- Ready! 🎉

## 📋 Commands

| Command | Description |
|---------|-------------|
| `Zazu: Setup Project` | Complete automated setup |
| `Zazu: Run Diagnosis` | Test JIRA connection |
| `Zazu: Show Status Menu` | Open main menu |
| `Zazu: Open Settings` | Open configuration |

## ⚙️ Configuration

### Required Settings
```json
{
  "zazu.repositoryUrl": "https://github.com/carlosmedinainditex/zazu-ai-assistant.git",
  "zazu.projectPath": "${workspaceFolder}",
  "zazu.env.jiraServer": "https://jira.inditex.com/jira",
  "zazu.env.jiraUser": "your-username",
  "zazu.env.jiraToken": "your-token"
}
```

## 🎮 Status Menu

```
Status: ✅ Project ready
🚀 Complete Setup
🩺 Run Diagnosis
─────────────────
⚙️ Settings
─────────────────
❌ Close
```

## 🔄 Workflow

```
Configure JIRA credentials → Click "Z" → Complete Setup → Project Ready
```

## 📦 Project Structure

```
zazu-vsc-extension/
├── src/extension.ts     # Main code (simplified)
├── out/extension.js     # Compiled (164kb)
├── package.json         # Essential config
└── README.md           # This file
```

## 🛠️ Development

```bash
npm run compile     # Compile
npm run watch       # Development mode
npm run package     # Create extension
```

## 🐛 Troubleshooting

- **"Z" missing**: Execute any Zazu command to activate
- **Setup fails**: Check repository URL and JIRA credentials
- **Dependencies error**: Ensure Python3, pip3, and git are installed
