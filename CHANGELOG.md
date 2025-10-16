# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-10-17

### 🔧 Changed
- ⚙️ **Default clone mode**: Changed from `subfolder` to `current-folder` for better user experience
- 📁 **Project cloning**: Now clones directly in the current workspace directory by default
- 📖 **Documentation**: Updated README to reflect the new default cloning behavior
- 👤 **Publisher**: Updated from `zazu-developer` to `carlos-medina` for proper attribution
- 🏷️ **Extension name**: Changed from "Zazu Project Setup" to "Zazu AI Assistant" for better branding

### 🚀 Improved
- 📊 **Status bar**: Now appears immediately when VS Code starts (using `onStartupFinished` activation)
- 🔄 **Initial status**: Automatically checks project status on extension activation

## [0.1.0] - 2025-10-17

### 🎉 Added
- ✨ **Smart context menu**: "Z" icon in status bar with dropdown menu
- 🎯 **Dynamic visual status**: ✅ OK, ⚠️ Warning, 🔥 Error, 🔄 Unknown
- 📍 **Flexible cloning modes**: `current-folder`, `subfolder`, `custom-path`
- 🧠 **GitHub Copilot auto-configuration**: Automatically moves instructions to correct locations
- 📄 **MIT License**: Copyright Carlos Medina with official LICENSE file
- 🎮 **Show Status Menu command**: Quick access from status bar
- 🔧 **Open Settings command**: Direct access to Zazu configuration

### 🚀 Improved
- ⚡ **Performance**: Only activates when needed (not on VS Code startup)
- 🎨 **UX/UI**: Cleaner interface and intuitive context menu
- 📊 **Status Bar**: Simple "Z" icon that changes color based on status
- 🔄 **Setup Project**: Simplified process without unnecessary progress bar
- 📋 **Configuration**: Clearer options with `cloneMode` and better documentation

### 🧹 Removed
- ❌ **runTests function**: Redundant with runDiagnosis
- ❌ **Automatic auto-setup**: Now disabled by default
- ❌ **Unit tests**: Were not being used
- ❌ **Temporary files**: SETUP.md, update-extension.sh, *.vsix
- ❌ **Unnecessary dependencies**: @types/mocha, @vscode/test-cli, @vscode/test-electron
- ❌ **Progress bar**: Removed from setup for greater simplicity

### 🔧 Technical
- 📦 **Optimized size**: From 172.8kb → 169.5kb (compiled)
- 🏗️ **Clean structure**: Single source file (src/extension.ts)
- ⚙️ **Optimized activation**: Only onCommand instead of "*"
- 📝 **Clean code**: Optimized functions and elimination of redundancies
- 🔒 **Security**: Safe handling of configurations without storing credentials

### ✅ Fixed
- ✅ **Commands Palette**: Commands now appear correctly in Cmd+Shift+P
- ✅ **GitHub Copilot**: Instructions are configured automatically in correct locations
- ✅ **Performance**: No auto-execution on VS Code startup
- ✅ **Workspace variables**: ${workspaceFolder} resolves correctly

## [0.0.1] - 2025-10-16

### 🎉 Added (Initial version)
- ✨ Initial setup of Zazu Project Setup extension
- 🚀 Main command `Zazu: Setup Project` for complete automation
- 🔍 Command `Zazu: Check Dependencies` to verify Python3, pip3 and git
- 📥 Command `Zazu: Clone Repository` for automatic cloning
- ⚙️ Command `Zazu: Configure Environment` for automatic .env generation
- 🧪 Command `Zazu: Run Tests` for JQL query execution
- 🩺 Command `Zazu: Run Diagnosis` to verify JIRA connection
- 📋 Visual configurations in VS Code Settings
- 🎯 Specific integration with Zazu AI Assistant project
- 🔄 Git integration using simple-git
- 📊 Progress indicators during setup

### 🔧 Technical (Initial version)
- TypeScript as main language
- Complete integration with VS Code API
- Bundle with esbuild for optimization
- Development configuration with debugging
- ESLint configured for code quality
