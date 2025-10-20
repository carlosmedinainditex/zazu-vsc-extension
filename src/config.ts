import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import { ZazuConfig } from './types';

/**
 * Configuration manager for Zazu extension
 */
export class ConfigManager {
  /**
   * Get the current Zazu configuration from VS Code settings
   */
  static getConfig(): ZazuConfig {
    const config = vscode.workspace.getConfiguration('zazu');
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    
    let projectPath = config.get('projectPath', '${workspaceFolder}');
    
    // Replace ${workspaceFolder} if necessary
    if (projectPath.includes('${workspaceFolder}')) {
      if (workspaceFolder) {
        projectPath = projectPath.replace('${workspaceFolder}', workspaceFolder);
      } else {
        projectPath = projectPath.replace('${workspaceFolder}', os.homedir());
      }
    }
    
    return {
      repositoryUrl: config.get('repositoryUrl', 'https://github.com/carlosmedinainditex/zazu-ai-assistant.git'),
      projectPath: projectPath,
      env: {
        jiraServer: config.get('env.jiraServer', 'https://jira.inditex.com/jira'),
        jiraUser: config.get('env.jiraUser', ''),
        jiraToken: config.get('env.jiraToken', '')
      }
    };
  }

  /**
   * Validate that required configuration is present
   */
  static validateConfig(config: ZazuConfig): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    if (!config.repositoryUrl) {
      missing.push('repositoryUrl');
    }
    if (!config.projectPath) {
      missing.push('projectPath');
    }
    if (!config.env.jiraServer) {
      missing.push('jiraServer');
    }
    if (!config.env.jiraUser) {
      missing.push('jiraUser');
    }
    if (!config.env.jiraToken) {
      missing.push('jiraToken');
    }
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Check if JIRA credentials are configured
   */
  static isJiraConfigured(config: ZazuConfig): boolean {
    return !!(config.env.jiraUser && config.env.jiraToken && config.env.jiraServer);
  }

  /**
   * Open VS Code settings for Zazu configuration
   */
  static openSettings(): void {
    vscode.commands.executeCommand('workbench.action.openSettings', 'zazu');
  }
}
