# Zazu AI Assistant Extension

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-0.3.0-green.svg)
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
code --install-extension zazu-ai-assistant-0.3.0.vsix
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

The status menu shows different states based on your project configuration:

```
Status: ✅ Project found and settings configured
---
🚀 Complete Setup
📋 Diagnosis Report
---
⚙️ Settings
---
❌ Close
```

### 📊 Possible Status States

| Icon | Status | Description |
|------|--------|-------------|
| ✅ | **Project ready** | All configured and working |
| 🔥 | **Connection failed** | JIRA connection issues |
| ❌ | **Not configured** | No project found - run setup |
| ⚠️ | **Incomplete** | Project missing files/config |
| 🔨 | **Missing dependencies** | System requirements not met |
| 🔧 | **Missing credentials** | JIRA user/token not configured |
| ❓ | **Unknown** | Status needs verification |

## 🔄 Workflow

```
Configure JIRA credentials → Click "Z" → Complete Setup → Project Ready
```

## 📦 Project Structure

```
zazu-vsc-extension/
├── src/                          # Source code (modular architecture)
│   ├── extension.ts             # Main extension entry point
│   ├── types.ts                 # TypeScript interfaces & constants
│   ├── config.ts                # Configuration management
│   ├── system-utils.ts          # System operations & dependency checking
│   ├── project-manager.ts       # Git operations & project setup
│   └── status-manager.ts        # Status tracking & UI management
├── out/
│   └── extension.js             # Compiled bundle (~170kb)
├── images/
│   └── zazu-logo.png            # Extension icon
├── package.json                 # Extension manifest & dependencies
├── tsconfig.json                # TypeScript configuration
├── CHANGELOG.md                 # Version history
└── README.md                    # Documentation
```

### 🏗️ Architecture Overview

- **Modular Design**: Clean separation of concerns across 5 specialized modules
- **Cross-Platform**: Full Windows and Unix/macOS compatibility
- **Type Safety**: Comprehensive TypeScript interfaces and error handling
- **Single Bundle**: All modules compiled into one optimized extension.js file

## 🛠️ Development

```bash
npm run compile     # Compile
npm run watch       # Development mode
npm run package     # Create extension
```

## 🌍 Cross-Platform Support

This extension works on **Windows**, **macOS**, and **Linux**:

- **Windows**: Uses `python` and `pip` commands
- **Unix/macOS**: Uses `python3` and `pip3` commands  
- **Automatic detection**: Detects your OS and uses appropriate commands
- **Fallback support**: Tries alternative commands if primary ones fail

## ⚡ System Requirements

### Required Dependencies
- **Git**: For repository cloning
- **Python**: Version 3.7+ (`python` on Windows, `python3` on Unix)
- **Pip**: Python package manager (`pip` on Windows, `pip3` on Unix)
- **VS Code**: Version 1.74.0 or higher

### Installation Commands
```bash
# Windows (using chocolatey)
choco install git python

# macOS (using homebrew) 
brew install git python3

# Ubuntu/Debian
sudo apt-get install git python3 python3-pip
```

## 🐛 Troubleshooting

- **"Z" missing**: Execute any Zazu command to activate extension
- **Setup fails**: Check repository URL and JIRA credentials in settings
- **Dependencies error**: Ensure Git and Python are installed and in PATH
- **Python not found**: Try installing Python 3.7+ and restart VS Code
- **Permission errors**: Run VS Code as administrator (Windows) or check folder permissions
