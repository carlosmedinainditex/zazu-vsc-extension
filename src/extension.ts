import * as vscode from 'vscode';
import { ConfigManager } from './config';
import { StatusManager } from './status-manager';
import { ProjectManager } from './project-manager';
import { SystemUtils } from './system-utils';

/**
 * Extension activation point
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Zazu Project Setup extension is now active!');

  // Initialize status manager
  const statusManager = StatusManager.getInstance();
  statusManager.initialize(context);

  // Register commands
  const commands = [
    vscode.commands.registerCommand('zazu.setupProject', () => setupProject(statusManager)),
    vscode.commands.registerCommand('zazu.runDiagnosis', () => runDiagnosis(statusManager)),
    vscode.commands.registerCommand('zazu.showStatusMenu', () => showStatusMenu(statusManager)),
    vscode.commands.registerCommand('zazu.openSettings', ConfigManager.openSettings)
  ];

  commands.forEach(command => context.subscriptions.push(command));

  // Initialize status
  const config = ConfigManager.getConfig();
  const projectValidation = SystemUtils.validateProjectStructure(config.projectPath);
  
  if (projectValidation.exists) {
    statusManager.updateStatus('unknown', 'Project found, run diagnosis to verify');
  } else {
    statusManager.updateStatus('unknown', 'Project not configured');
  }
}

/**
 * Complete project setup workflow
 */
async function setupProject(statusManager: StatusManager): Promise<void> {
  const config = ConfigManager.getConfig();
  
  // Validate basic configuration
  const validation = ConfigManager.validateConfig(config);
  if (!validation.valid) {
    vscode.window.showErrorMessage(
      `❌ Missing configuration: ${validation.missing.join(', ')}`
    );
    ConfigManager.openSettings();
    return;
  }

  try {
    vscode.window.showInformationMessage('🔄 Starting Zazu setup...');
    statusManager.updateStatus('unknown', 'Setup in progress...');
    
    // 1. Check and install system dependencies
    const missingDeps = await SystemUtils.checkSystemDependencies();
    if (missingDeps.length > 0) {
      vscode.window.showInformationMessage(`📦 Installing: ${missingDeps.join(', ')}...`);
      
      const result = await SystemUtils.installSystemDependencies(missingDeps);
      if (!result.success) {
        throw new Error(result.message);
      }
      
      vscode.window.showInformationMessage(result.message);
      
      // Suggest restart on Windows
      const platform = require('os').platform();
      if (platform === 'win32') {
        const choice = await vscode.window.showInformationMessage(
          'Restart VS Code for PATH changes to take effect?',
          'Restart Now',
          'Continue'
        );
        
        if (choice === 'Restart Now') {
          await vscode.commands.executeCommand('workbench.action.reloadWindow');
          return;
        }
      }
    }
    
    // 2. Clone repository
    await ProjectManager.cloneRepository(config);
    
    // 3. Install Python dependencies
    await ProjectManager.installPythonDependencies(config);
    
    // 4. Configure environment
    await ProjectManager.configureEnvironment(config);
    
    // 5. Run diagnosis test
    const diagnosisSuccess = await ProjectManager.runDiagnosis(config, true);
    
    if (diagnosisSuccess) {
      statusManager.updateStatus('healthy', 'Setup completed successfully');
      vscode.window.showInformationMessage('✅ Zazu project setup completed!');
    } else {
      statusManager.updateStatus('warning', 'Setup completed but diagnosis failed');
      vscode.window.showWarningMessage('⚠️ Setup completed but JIRA connection test failed');
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const detailedError = `❌ Setup failed\n\n${errorMessage}\n\nPlease check the error details above and try again.`;
    
    statusManager.updateStatus('error', `Setup failed: ${errorMessage}`);
    
    // Show error in modal with more details
    vscode.window.showErrorMessage(detailedError, { modal: true }, 'Open Settings', 'Close')
      .then(selection => {
        if (selection === 'Open Settings') {
          ConfigManager.openSettings();
        }
      });
  }
}

/**
 * Run diagnosis and show detailed report
 */
async function runDiagnosis(statusManager: StatusManager): Promise<void> {
  const config = ConfigManager.getConfig();
  
  try {
    const success = await ProjectManager.runDiagnosis(config, false);
    
    if (success) {
      statusManager.updateStatus('healthy', 'JIRA connection OK');
    } else {
      statusManager.updateStatus('error', 'JIRA connection failed');
    }
    
    // Show detailed status after diagnosis
    statusManager.showDetailedStatus(config);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    statusManager.updateStatus('error', errorMessage);
  }
}

/**
 * Show status menu with current project state
 */
async function showStatusMenu(statusManager: StatusManager): Promise<void> {
  const config = ConfigManager.getConfig();
  
  // Determine current project status
  const status = await statusManager.determineProjectStatus(config);
  
  const options = [
    `Status: ${status.icon} ${status.text}`,
    '---',
    '🚀 Complete Setup',
    '📋 Diagnosis Report',
    '---',
    '⚙️ Settings',
    '---',
    '❌ Close'
  ];
  
  const selection = await vscode.window.showQuickPick(options, {
    placeHolder: 'Zazu Menu - Select an option',
    ignoreFocusOut: true
  });
  
  if (!selection || selection === '❌ Close' || selection === '---') {
    return;
  }
  
  if (selection.startsWith('Status:')) {
    return;
  }
  
  switch (selection) {
    case '🚀 Complete Setup':
      await setupProject(statusManager);
      break;
    case '📋 Diagnosis Report':
      await runDiagnosis(statusManager);
      break;
    case '⚙️ Settings':
      ConfigManager.openSettings();
      break;
  }
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  StatusManager.getInstance().dispose();
  console.log('Zazu Project Setup extension deactivated');
}
