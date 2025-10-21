# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.2] - 2025-10-22

### 🧹 Code Refactoring and Cleanup

#### Removed
- **Unused function `getCommand()`**: Eliminated dead code that was never called
- **Redundant command fallback logic**: Simplified Python/pip command handling (no more python3→python fallback)
- **Duplicate dependency checking**: Replaced complex Promise-based implementation with simple async loop
- **Unused variable `errorMsg`**: Removed from installDependency function

#### Improved
- **Simplified `checkSystemDependencies()`**: Reduced from 80+ lines to 12 lines using existing `checkCommand()` helper
- **Cleaner error handling**: Consolidated error messages and removed redundant try-catch blocks
- **Better code organization**: Eliminated code duplication across project-manager.ts
- **Reduced bundle size**: From 180.1kb to 177.0kb (-3kb)

#### Technical Details
- More maintainable codebase with less complexity
- Consistent cross-platform command handling
- No functionality changes - purely internal improvements

## [0.4.1] - 2025-10-21

### 🚀 Simplified Automatic Installation with PATH Management

#### Added
- **Automatic PATH configuration**: Dependencies are automatically added to system PATH
- **Restart prompt**: Suggests restarting VS Code on Windows for PATH changes to take full effect
- **Python with pip**: Ensures pip/pip3 is installed alongside Python on all platforms
- **Extended installation parameters**:
  - Windows (winget): Uses `--scope machine` for Python
  - Windows (chocolatey): Uses `/AddToPath` and `/GitAndUnixToolsOnPath` parameters
  - Linux: Installs both `python3` and `python3-pip` packages
  - macOS: Uses `python@3.12` for specific version

#### Changed
- **Fully automatic installation**: No confirmation dialogs, dependencies are installed automatically when missing
- **pip3 handling**: Skipped during installation (comes with Python), but verified during checks
- **PATH update on Windows**: Automatically adds common Git and Python paths to current session
- **Clearer error messages**: Direct instructions when package managers are not available

#### Improved
- **Installation workflow**: 
  1. Detects missing dependencies
  2. Automatically installs them with proper PATH configuration
  3. Updates system PATH (Windows: adds common installation directories)
  4. Suggests restart on Windows for full PATH refresh
  5. Re-verifies installation
  6. Continues setup
- **Command availability**: Git and Python commands are immediately available after installation
- **Cross-platform consistency**: Ensures pip is installed on all platforms

#### Windows PATH Management
- Automatically adds to PATH:
  - `C:\Program Files\Git\cmd`
  - `C:\Program Files\Git\bin`
  - `%LOCALAPPDATA%\Programs\Python\Python312`
  - `%LOCALAPPDATA%\Programs\Python\Python312\Scripts`
  - `C:\Python312`
  - `C:\Python312\Scripts`

#### Windows Requirements
- Install **winget** (comes with Windows 11 or App Installer from Microsoft Store)
- Or install **chocolatey** from https://chocolatey.org/install
- If neither is available, manual installation instructions are shown

## [0.4.0] - 2025-10-21

### 🎯 Automatic Dependency Installation

#### Added
- **Automatic dependency installation**: The extension now attempts to install missing system dependencies automatically
- **Interactive installation prompt**: Users are asked for permission before installing dependencies
- **Platform-specific installation**: 
  - **macOS**: Uses Homebrew to install git and python3
  - **Linux**: Uses apt-get, yum, or dnf depending on the distribution
  - **Windows**: Shows download links for manual installation
- **Progress notifications**: Visual feedback during dependency installation process
- **Installation verification**: Re-checks dependencies after installation to confirm success

#### Improved
- **Better error handling**: Clearer error messages when dependencies cannot be installed
- **User guidance**: Specific instructions for each platform when automatic installation is not possible
- **Setup workflow**: Seamless integration of dependency installation into the setup process

#### Fixed
- **Dependency check failure**: No longer stops setup immediately when dependencies are missing
- **Manual installation flow**: Better guidance for users who need to install dependencies manually

### 📋 Installation Behavior

When missing dependencies are detected during setup:
1. Extension shows a notification listing the missing dependencies
2. User is prompted to install them automatically or cancel
3. If approved, the extension attempts platform-specific installation
4. Dependencies are re-verified after installation
5. Setup continues only if all dependencies are present

## [0.3.0] - 2025-10-20

### 🔧 Cross-Platform Compatibility & Code Optimization

#### Added
- **Cross-platform support**: Full Windows and Unix compatibility for all commands
- **Smart Python detection**: Automatically uses `python` on Windows and `python3` on Unix
- **Enhanced dependency checking**: Platform-aware command validation
- **Robust file operations**: Cross-platform file copying and directory management

#### Improved
- **Command execution**: Better error handling and timeout management
- **System utilities**: Platform-specific command detection and execution
- **Project management**: Cross-platform git operations and Python package installation
- **Performance**: Optimized dependency checking with proper timeout handling

#### Removed
- **Unused dependencies**: Removed `node-fetch` dependency (not used)
- **Temporary files**: Cleaned up development artifacts and backup files

#### Fixed
- **TypeScript errors**: Resolved all compilation issues with proper type annotations
- **Memory leaks**: Better process management and cleanup
- **Platform detection**: Proper OS detection for Windows/Unix command differences

## [0.2.1] - 2025-10-20

### 🎨 UI/UX Improvements

#### Changed
- **Status menu layout**: Added separator line between status and action options for better visual organization
- **Status messages**: Made status texts more descriptive and actionable:
  - ❌ `No project configured - Use Complete Setup`
  - ✅ `Project ready and working`
  - 🔥 `Setup failed - Check configuration`
  - ⚠️ `Project found - Use Diagnosis Report to verify`
- **Menu option naming**: Changed `🩺 Run Diagnosis` to `📋 Diagnosis Report` for clarity

#### Improved
- **User guidance**: Status messages now explicitly reference which menu option to use
- **Visual separation**: Clear sections in dropdown menu for better usability
- **Emoji consistency**: Fixed corrupted emoji character and improved visibility

### 📋 Menu Structure
```
Status: [icon] [descriptive message]
─────────────────────────────────
🚀 Complete Setup
📋 Diagnosis Report
─────────────────────────────────
⚙️ Settings
─────────────────────────────────
❌ Close
```

## [0.2.0] - 2025-10-20

### 🚀 Major Simplification

#### Changed
- **Simplified menu**: Added "Status:" prefix to status line, reorganized options, separated settings
- **Streamlined commands**: Removed unnecessary commands, kept only essential ones
- **Unified cloning**: Removed complex multi-mode cloning, simplified to single workspace cloning
- **Essential setup**: Focuses only on clone → install deps → basic test

#### Removed
- Multiple cloning modes (current-folder, subfolder, custom-path)
- GitHub Copilot instructions auto-setup
- Excessive dependency checks
- Unnecessary JIRA configuration options (maxResults, defaultJql)
- Individual commands (checkDependencies, cloneRepository, configureEnv)
- Complex status reporting and detailed diagnostics

#### Improved
- **Menu structure**: "Status: [icon] [message]" → "Complete Setup" → "Run Diagnosis" → "Settings"
- **Code size**: Reduced from 169.5kb to 164.2kb
- **Setup flow**: Clone remote project → Install dependencies → Run basic tests
- **Configuration**: Only essential settings for URL, path, and JIRA credentials

### 🎯 Focus
Now the extension does exactly what's needed:
1. Clone the Zazu project
2. Install required dependencies  
3. Run necessary tests to start working

No over-engineering, no unnecessary features, no excessive validations.

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

### 🎨 Added
- 🖼️ **Extension icon**: Added ZAZU logo as extension icon for better visual identification
- 🎨 **Gallery banner**: Configured dark theme banner for VS Code marketplace

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
