import * as vscode from 'vscode';
import { ZazuStatus, ZazuConfig, ProjectStatus } from './types';
import { SystemUtils } from './system-utils';
import { ConfigManager } from './config';

/**
 * Status manager for tracking and displaying project status
 */
export class StatusManager {
  private static instance: StatusManager;
  private statusBarItem: vscode.StatusBarItem;
  private status: ZazuStatus;

  private constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'zazu.showStatusMenu';
    this.status = {
      status: 'unknown',
      message: 'Zazu not initialized',
      lastCheck: new Date()
    };
  }

  static getInstance(): StatusManager {
    if (!StatusManager.instance) {
      StatusManager.instance = new StatusManager();
    }
    return StatusManager.instance;
  }

  /**
   * Initialize status bar item
   */
  initialize(context: vscode.ExtensionContext): void {
    context.subscriptions.push(this.statusBarItem);
    this.updateStatusBar();
  }

  /**
   * Update the current status
   */
  updateStatus(status: 'unknown' | 'healthy' | 'warning' | 'error', message: string): void {
    this.status = {
      status,
      message,
      lastCheck: new Date()
    };
    this.updateStatusBar();
  }

  /**
   * Get current status
   */
  getCurrentStatus(): ZazuStatus {
    return { ...this.status };
  }

  /**
   * Update the status bar display
   */
  private updateStatusBar(): void {
    if (!this.statusBarItem) {
      return;
    }
    
    const colors = {
      unknown: undefined,
      healthy: undefined,
      warning: new vscode.ThemeColor('statusBarItem.warningBackground'),
      error: new vscode.ThemeColor('statusBarItem.errorBackground')
    };
    
    this.statusBarItem.text = 'Z';
    this.statusBarItem.backgroundColor = colors[this.status.status];
    this.statusBarItem.tooltip = `Zazu Status: ${this.status.message}\nLast check: ${this.status.lastCheck.toLocaleTimeString()}\n\nClick for options...`;
    this.statusBarItem.show();
  }

  /**
   * Determine project status based on current state
   */
  async determineProjectStatus(config: ZazuConfig): Promise<ProjectStatus> {
    // Check system dependencies first
    const missingDeps = await SystemUtils.checkSystemDependencies();
    if (missingDeps.length > 0) {
      return {
        icon: '🔨',
        text: `Missing dependencies: ${missingDeps.join(', ')} - Install them first`
      };
    }
    
    // Check project structure
    const projectValidation = SystemUtils.validateProjectStructure(config.projectPath);
    
    if (!projectValidation.exists) {
      return {
        icon: '❌',
        text: 'No project cloned/found - Use Complete Setup'
      };
    }
    
    if (!projectValidation.hasRequiredFiles) {
      return {
        icon: '⚠️',
        text: 'Project incomplete - Use Complete Setup'
      };
    }
    
    // Check JIRA configuration
    if (!ConfigManager.isJiraConfigured(config)) {
      return {
        icon: '🔧',
        text: 'Missing JIRA User/Token - Use Settings to configure'
      };
    }
    
    // Use the actual diagnosis status
    switch (this.status.status) {
      case 'healthy':
        return {
          icon: '✅',
          text: 'Project found and settings configured'
        };
      case 'error':
        return {
          icon: '🔥',
          text: 'JIRA connection failed - Check Settings'
        };
      default:
        return {
          icon: '❓',
          text: 'Project ready - Use Diagnosis Report to verify connection'
        };
    }
  }

  /**
   * Show detailed status information
   */
  showDetailedStatus(config: ZazuConfig): void {
    const statusText = `Zazu Status: ${this.status.status.toUpperCase()}
Message: ${this.status.message}
Last Check: ${this.status.lastCheck.toLocaleString()}

Project Path: ${config.projectPath || 'Not configured'}
Repository: ${config.repositoryUrl}
JIRA Server: ${config.env.jiraServer}`;

    vscode.window.showInformationMessage(statusText, { modal: true });
  }

  /**
   * Dispose of status bar item
   */
  dispose(): void {
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
    }
  }
}
