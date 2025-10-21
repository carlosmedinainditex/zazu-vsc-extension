import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { SYSTEM_DEPENDENCIES, REQUIRED_PROJECT_FILES } from './types';

/**
 * System utilities for dependency checking and process execution
 */
export class SystemUtils {
  /**
   * Install missing system dependencies
   */
  static async installSystemDependencies(missingDeps: string[]): Promise<{ success: boolean; message: string }> {
    const platform = os.platform();
    
    // Show progress and install
    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Installing dependencies',
      cancellable: false
    }, async (progress) => {
      try {
        const errors: string[] = [];
        
        for (const dep of missingDeps) {
          // Skip pip3 - it comes with Python
          if (dep === 'pip3') {
            continue;
          }
          
          progress.report({ message: `Installing ${dep}...` });
          
          const installed = await SystemUtils.installDependency(dep, platform);
          if (!installed.success) {
            errors.push(`${dep}: ${installed.error || 'Unknown error'}`);
          }
        }
        
        if (errors.length > 0) {
          return {
            success: false,
            message: `Failed to install dependencies:\n${errors.join('\n')}\n\nPlease install manually and restart VS Code.`
          };
        }
        
        // Update PATH and verify installation
        progress.report({ message: 'Updating PATH...' });
        await SystemUtils.updateSystemPath(platform);
        
        return { success: true, message: '✅ Dependencies installed successfully!' };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, message: `Installation error: ${errorMessage}` };
      }
    });
  }

  /**
   * Update system PATH to include newly installed dependencies
   */
  private static async updateSystemPath(platform: string): Promise<void> {
    if (platform === 'win32') {
      // On Windows, refresh environment variables
      const commonPaths = [
        'C:\\Program Files\\Git\\cmd',
        'C:\\Program Files\\Git\\bin',
        `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python312`,
        `${process.env.LOCALAPPDATA}\\Programs\\Python\\Python312\\Scripts`,
        'C:\\Python312',
        'C:\\Python312\\Scripts'
      ];
      
      // Add common installation paths to current process PATH
      const currentPath = process.env.PATH || '';
      const newPaths = commonPaths.filter(p => fs.existsSync(p) && !currentPath.includes(p));
      
      if (newPaths.length > 0) {
        process.env.PATH = `${newPaths.join(';')};${currentPath}`;
      }
    }
    
    // Wait a moment for system to update
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Install a specific dependency based on the platform
   */
  private static async installDependency(dep: string, platform: string): Promise<{ success: boolean; error?: string }> {
    // Skip pip3 installation on all platforms - it comes with Python
    if (dep === 'pip3') {
      return { success: true };
    }
    
    let command: string;
    let args: string[];

    switch (platform) {
      case 'darwin': // macOS
        if (dep === 'git' || dep === 'python3') {
          const hasHomebrew = await SystemUtils.checkCommand('brew');
          if (hasHomebrew) {
            command = 'brew';
            args = ['install', dep === 'python3' ? 'python@3.12' : dep];
          } else {
            return { success: false, error: 'Homebrew not installed. Install from: https://brew.sh' };
          }
        } else {
          return { success: false, error: `Cannot install ${dep} on macOS` };
        }
        break;

      case 'linux':
        const hasApt = await SystemUtils.checkCommand('apt-get');
        const hasYum = await SystemUtils.checkCommand('yum');
        const hasDnf = await SystemUtils.checkCommand('dnf');
        
        if (hasApt) {
          command = 'sudo';
          args = ['apt-get', 'install', '-y', dep === 'python3' ? 'python3 python3-pip' : dep];
        } else if (hasYum) {
          command = 'sudo';
          args = ['yum', 'install', '-y', dep === 'python3' ? 'python3 python3-pip' : dep];
        } else if (hasDnf) {
          command = 'sudo';
          args = ['dnf', 'install', '-y', dep === 'python3' ? 'python3 python3-pip' : dep];
        } else {
          return { success: false, error: 'No supported package manager found' };
        }
        break;

      case 'win32': // Windows
        const hasWinget = await SystemUtils.checkCommand('winget');
        const hasChoco = await SystemUtils.checkCommand('choco');
        
        if (hasWinget) {
          command = 'winget';
          if (dep === 'git') {
            args = ['install', '--id', 'Git.Git', '-e', '--silent', '--accept-source-agreements', '--accept-package-agreements'];
          } else if (dep === 'python3') {
            args = ['install', '--id', 'Python.Python.3.12', '-e', '--silent', '--accept-source-agreements', '--accept-package-agreements', '--scope', 'machine'];
          } else {
            return { success: false, error: `Unknown dependency: ${dep}` };
          }
        } else if (hasChoco) {
          command = 'choco';
          if (dep === 'git') {
            args = ['install', 'git', '-y', '--params', '"/GitAndUnixToolsOnPath"'];
          } else if (dep === 'python3') {
            args = ['install', 'python', '-y', '--params', '"/AddToPath"'];
          } else {
            return { success: false, error: `Unknown dependency: ${dep}` };
          }
        } else {
          const url = dep === 'git' ? 'https://git-scm.com/download/win' : 'https://www.python.org/downloads/';
          return { success: false, error: `No package manager (winget/chocolatey) found. Install from: ${url}` };
        }
        break;

      default:
        return { success: false, error: `Unsupported platform: ${platform}` };
    }

    const result = await SystemUtils.executeCommand(command, args);
    if (!result.success) {
      return { success: false, error: result.error || result.output };
    }
    
    return { success: true };
  }

  /**
   * Check if a command exists in the system
   */
  private static async checkCommand(command: string): Promise<boolean> {
    const platform = os.platform();
    const checkCmd = platform === 'win32' ? 'where' : 'which';
    
    const result = await SystemUtils.executeCommand(checkCmd, [command]);
    return result.success;
  }

  /**
   * Check if system dependencies are installed
   */
  static async checkSystemDependencies(): Promise<string[]> {
    const missing: string[] = [];
    
    for (const dep of SYSTEM_DEPENDENCIES) {
      const exists = await SystemUtils.checkCommand(dep);
      if (!exists) {
        missing.push(dep);
      }
    }
    
    return missing;
  }

  /**
   * Execute a shell command with progress tracking (cross-platform)
   */
  static async executeCommand(
    command: string, 
    args: string[], 
    options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
  ): Promise<{ success: boolean; output: string; error: string }> {
    return new Promise((resolve) => {
      const isWindows = os.platform() === 'win32';
      
      // Handle Python command for cross-platform compatibility
      let actualCommand = command;
      if (command === 'python3' && isWindows) {
        actualCommand = 'python';
      }
      
      const childProcess = spawn(actualCommand, args, {
        shell: true,
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        stdio: 'pipe'
      });
      
      let output = '';
      let errorOutput = '';
      
      childProcess.stdout?.on('data', (data: Buffer) => {
        output += data.toString();
      });
      
      childProcess.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });
      
      childProcess.on('close', (code: number | null) => {
        resolve({
          success: code === 0,
          output,
          error: errorOutput
        });
      });
      
      childProcess.on('error', (error: Error) => {
        resolve({
          success: false,
          output: '',
          error: error.message
        });
      });
    });
  }

  /**
   * Check if project directory exists and has required files
   */
  static validateProjectStructure(projectPath: string): {
    exists: boolean;
    hasRequiredFiles: boolean;
    missingFiles: string[];
  } {
    if (!fs.existsSync(projectPath)) {
      return {
        exists: false,
        hasRequiredFiles: false,
        missingFiles: Object.values(REQUIRED_PROJECT_FILES)
      };
    }

    const missingFiles: string[] = [];
    const requiredFiles = Object.values(REQUIRED_PROJECT_FILES);
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(projectPath, file))) {
        missingFiles.push(file);
      }
    }

    return {
      exists: true,
      hasRequiredFiles: missingFiles.length === 0,
      missingFiles
    };
  }

  /**
   * Create directory if it doesn't exist
   */
  static ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Clean directory contents
   */
  static cleanDirectory(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }
}
