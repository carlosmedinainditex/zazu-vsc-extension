import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
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
