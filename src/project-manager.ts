import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { simpleGit, SimpleGit } from 'simple-git';
import { ZazuConfig } from './types';
import { SystemUtils } from './system-utils';

/**
 * Project manager for handling git operations and project setup
 */
export class ProjectManager {
  
  /**
   * Clone or update the Zazu repository
   */
  static async cloneRepository(config: ZazuConfig): Promise<void> {
    if (!config.repositoryUrl || !config.projectPath) {
      throw new Error('Repository URL or project path not configured');
    }

    const git: SimpleGit = simpleGit();
    
    // Check if directory exists and has git content
    if (fs.existsSync(config.projectPath)) {
      const gitDir = path.join(config.projectPath, '.git');
      if (fs.existsSync(gitDir)) {
        try {
          const gitRepo = simpleGit(config.projectPath);
          await gitRepo.pull();
          vscode.window.showInformationMessage('Repository updated from remote');
          return;
        } catch (error) {
          // If pull fails, continue with cloning
        }
      }
      
      const isEmptyDir = fs.readdirSync(config.projectPath).length === 0;
      if (!isEmptyDir) {
        const choice = await vscode.window.showWarningMessage(
          `Directory ${config.projectPath} is not empty. Overwrite?`,
          'Yes', 'Cancel'
        );
        
        if (choice !== 'Yes') {
          throw new Error('Cloning cancelled by user');
        }
        
        SystemUtils.cleanDirectory(config.projectPath);
      }
    }
    
    // Ensure directory exists
    SystemUtils.ensureDirectory(config.projectPath);
    
    try {
      // Clone in temporary directory and move content
      const tempDir = path.join(os.tmpdir(), 'zazu-clone-' + Date.now());
      await git.clone(config.repositoryUrl, tempDir);
      
      // Move content from temporary directory to target directory
      const items = fs.readdirSync(tempDir);
      for (const item of items) {
        const srcPath = path.join(tempDir, item);
        const destPath = path.join(config.projectPath, item);
        
        // Try atomic move first, fallback to copy/delete with error handling
        try {
          fs.renameSync(srcPath, destPath);
        } catch (err) {
          try {
            if (fs.statSync(srcPath).isDirectory()) {
              fs.cpSync(srcPath, destPath, { recursive: true });
              fs.rmSync(srcPath, { recursive: true, force: true });
            } else {
              fs.copyFileSync(srcPath, destPath);
              fs.unlinkSync(srcPath);
            }
          } catch (moveErr) {
            vscode.window.showErrorMessage(`Failed to move ${srcPath} to ${destPath}: ${moveErr}`);
            throw moveErr;
          }
        }
      }
      
      // Clean up temporary directory
      SystemUtils.cleanDirectory(tempDir);
      
      vscode.window.showInformationMessage(`Repository cloned at: ${config.projectPath}`);
    } catch (error) {
      throw new Error(`Error cloning repository: ${error}`);
    }
  }

  /**
   * Install Python dependencies from requirements.txt (cross-platform)
   */
  static async installPythonDependencies(config: ZazuConfig): Promise<void> {
    const requirementsPath = path.join(config.projectPath, 'req', 'requirements.txt');
    
    if (!fs.existsSync(requirementsPath)) {
      throw new Error('requirements.txt file not found');
    }

    // Try pip3 first, then pip for cross-platform compatibility
    const isWindows = os.platform() === 'win32';
    const pipCommand = isWindows ? 'pip' : 'pip3';
    
    const result = await SystemUtils.executeCommand(
      pipCommand, 
      ['install', '-r', requirementsPath], 
      { cwd: config.projectPath }
    );

    if (result.success) {
      vscode.window.showInformationMessage('Python dependencies installed correctly ✅');
    } else {
      // Try alternative pip command if first one failed
      if (!isWindows) {
        const altResult = await SystemUtils.executeCommand(
          'pip', 
          ['install', '-r', requirementsPath], 
          { cwd: config.projectPath }
        );
        
        if (altResult.success) {
          vscode.window.showInformationMessage('Python dependencies installed correctly ✅');
          return;
        }
      }
      
      vscode.window.showErrorMessage('Error installing Python dependencies');
      
      // Show output in a new document
      vscode.workspace.openTextDocument({
        content: `STDOUT:\n${result.output}\n\nSTDERR:\n${result.error}`,
        language: 'plaintext'
      }).then((doc) => {
        vscode.window.showTextDocument(doc);
      });
      
      throw new Error(`Installation failed: ${result.error}`);
    }
  }

  /**
   * Configure environment variables (.env file)
   */
  static async configureEnvironment(config: ZazuConfig): Promise<void> {
    const envPath = path.join(config.projectPath, 'env', '.env');
    
    const envContent = `# JIRA API Configuration
JIRA_SERVER=${config.env.jiraServer}
JIRA_USER=${config.env.jiraUser}
JIRA_TOKEN=${config.env.jiraToken}
`;

    try {
      // Create env directory if it doesn't exist
      const envDir = path.dirname(envPath);
      SystemUtils.ensureDirectory(envDir);
      
      fs.writeFileSync(envPath, envContent);
      vscode.window.showInformationMessage('.env file configured');
    } catch (error) {
      throw new Error(`Error configuring .env: ${error}`);
    }
  }

  /**
   * Run project diagnosis (cross-platform)
   */
  static async runDiagnosis(config: ZazuConfig, silent: boolean = false): Promise<boolean> {
    if (!config.projectPath || !fs.existsSync(config.projectPath)) {
      const message = 'Zazu project not found. Run setup first.';
      if (!silent) {
        vscode.window.showErrorMessage(message);
      }
      throw new Error(message);
    }

    const diagnosticPath = path.join(config.projectPath, 'diagnosis', 'diagnostic.py');
    
    if (!fs.existsSync(diagnosticPath)) {
      const message = 'Diagnostic script not found in project.';
      if (!silent) {
        vscode.window.showErrorMessage(message);
      }
      throw new Error(message);
    }

    if (!silent) {
      vscode.window.showInformationMessage('Running Zazu diagnosis...');
    }

    // Use cross-platform Python command
    const isWindows = os.platform() === 'win32';
    const pythonCommand = isWindows ? 'python' : 'python3';
    
    const result = await SystemUtils.executeCommand(
      pythonCommand, 
      [diagnosticPath], 
      { cwd: config.projectPath }
    );

    if (result.success) {
      const message = 'Diagnosis completed successfully ✅';
      if (!silent) {
        vscode.window.showInformationMessage(message);
        
        // Show output in a new document
        vscode.workspace.openTextDocument({
          content: result.output,
          language: 'plaintext'
        }).then((doc) => {
          vscode.window.showTextDocument(doc);
        });
      }
      return true;
    } else {
      // Try alternative Python command if first one failed
      if (!isWindows) {
        const altResult = await SystemUtils.executeCommand(
          'python', 
          [diagnosticPath], 
          { cwd: config.projectPath }
        );
        
        if (altResult.success) {
          const message = 'Diagnosis completed successfully ✅';
          if (!silent) {
            vscode.window.showInformationMessage(message);
            
            vscode.workspace.openTextDocument({
              content: altResult.output,
              language: 'plaintext'
            }).then((doc) => {
              vscode.window.showTextDocument(doc);
            });
          }
          return true;
        }
      }
      
      const message = 'Diagnosis failed';
      if (!silent) {
        vscode.window.showErrorMessage(message);
        
        // Show error in a new document
        vscode.workspace.openTextDocument({
          content: `STDOUT:\n${result.output}\n\nSTDERR:\n${result.error}`,
          language: 'plaintext'
        }).then((doc) => {
          vscode.window.showTextDocument(doc);
        });
      }
      return false;
    }
  }
}
