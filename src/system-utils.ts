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
   * Get the appropriate command based on the platform
   */
  private static getCommand(command: string): { cmd: string; args: string[] } {
    const isWindows = os.platform() === 'win32';
    
    if (isWindows) {
      // On Windows, use 'where' command to check if command exists
      if (command === 'python3') {
        // Try python3 first, then python
        return { cmd: 'python', args: ['--version'] };
      }
      return { cmd: 'where', args: [command] };
    } else {
      // On Unix-like systems, use 'which' command
      return { cmd: command, args: ['--version'] };
    }
  }

  /**
   * Install missing system dependencies
   */
  static async installSystemDependencies(missingDeps: string[]): Promise<boolean> {
    const platform = os.platform();
    
    // Show information to user
    const message = `The following dependencies are missing: ${missingDeps.join(', ')}. Do you want to install them automatically?`;
    const choice = await vscode.window.showInformationMessage(
      message,
      { modal: true },
      'Install',
      'Cancel'
    );
    
    if (choice !== 'Install') {
      return false;
    }

    // Show progress
    return vscode.window.withProgress({
      location: vscode.ProgressLocation.Notification,
      title: 'Installing system dependencies',
      cancellable: false
    }, async (progress) => {
      try {
        for (const dep of missingDeps) {
          progress.report({ message: `Installing ${dep}...` });
          
          const installed = await SystemUtils.installDependency(dep, platform);
          if (!installed) {
            vscode.window.showErrorMessage(`Failed to install ${dep}. Please install it manually.`);
            return false;
          }
        }
        
        vscode.window.showInformationMessage('✅ All dependencies installed successfully!');
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error installing dependencies: ${errorMessage}`);
        return false;
      }
    });
  }

  /**
   * Install a specific dependency based on the platform
   */
  private static async installDependency(dep: string, platform: string): Promise<boolean> {
    let command: string;
    let args: string[];

    switch (platform) {
      case 'darwin': // macOS
        if (dep === 'git' || dep === 'python3') {
          // Check if Homebrew is installed
          const hasHomebrew = await SystemUtils.checkCommand('brew');
          if (hasHomebrew) {
            command = 'brew';
            args = ['install', dep === 'python3' ? 'python' : dep];
          } else {
            vscode.window.showErrorMessage('Homebrew is not installed. Please install Homebrew first: https://brew.sh');
            return false;
          }
        } else {
          vscode.window.showErrorMessage(`Cannot automatically install ${dep} on macOS.`);
          return false;
        }
        break;

      case 'linux':
        // Try to detect the package manager
        const hasApt = await SystemUtils.checkCommand('apt-get');
        const hasYum = await SystemUtils.checkCommand('yum');
        const hasDnf = await SystemUtils.checkCommand('dnf');
        
        if (hasApt) {
          command = 'sudo';
          args = ['apt-get', 'install', '-y', dep === 'python3' ? 'python3' : dep];
        } else if (hasYum) {
          command = 'sudo';
          args = ['yum', 'install', '-y', dep === 'python3' ? 'python3' : dep];
        } else if (hasDnf) {
          command = 'sudo';
          args = ['dnf', 'install', '-y', dep === 'python3' ? 'python3' : dep];
        } else {
          vscode.window.showErrorMessage('No supported package manager found on Linux.');
          return false;
        }
        break;

      case 'win32': // Windows
        if (dep === 'git') {
          vscode.window.showInformationMessage('Please download and install Git from: https://git-scm.com/download/win');
          return false;
        } else if (dep === 'python3') {
          vscode.window.showInformationMessage('Please download and install Python from: https://www.python.org/downloads/');
          return false;
        } else {
          vscode.window.showErrorMessage(`Cannot automatically install ${dep} on Windows.`);
          return false;
        }

      default:
        vscode.window.showErrorMessage(`Unsupported platform: ${platform}`);
        return false;
    }

    const result = await SystemUtils.executeCommand(command, args);
    return result.success;
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
    return new Promise((resolve) => {
      const dependencies = [...SYSTEM_DEPENDENCIES];
      const missing: string[] = [];
      let checked = 0;
      
      const checkDep = async (dep: string) => {
        const { cmd, args } = SystemUtils.getCommand(dep);
        const isWindows = os.platform() === 'win32';
        
        try {
          const process = spawn(cmd, args, { 
            shell: true,
            stdio: 'pipe'
          });
          
          let hasOutput = false;
          
          process.stdout?.on('data', () => {
            hasOutput = true;
          });
          
          process.stderr?.on('data', () => {
            hasOutput = true;
          });
          
          process.on('close', (code: number) => {
            // On Windows with 'where', code 0 means found
            // On Unix with '--version', code 0 means command exists
            if (isWindows && cmd === 'where') {
              if (code !== 0) {
                missing.push(dep);
              }
            } else {
              if (code !== 0 || !hasOutput) {
                missing.push(dep);
              }
            }
            
            checked++;
            if (checked === dependencies.length) {
              resolve(missing);
            }
          });
          
          process.on('error', () => {
            missing.push(dep);
            checked++;
            if (checked === dependencies.length) {
              resolve(missing);
            }
          });
          
          // Timeout after 5 seconds
          setTimeout(() => {
            if (checked < dependencies.length) {
              process.kill();
              missing.push(dep);
              checked++;
              if (checked === dependencies.length) {
                resolve(missing);
              }
            }
          }, 5000);
          
        } catch (error) {
          missing.push(dep);
          checked++;
          if (checked === dependencies.length) {
            resolve(missing);
          }
        }
      };
      
      dependencies.forEach(checkDep);
    });
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
