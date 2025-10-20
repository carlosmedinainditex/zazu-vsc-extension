import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';
import { spawn } from 'child_process';

interface ZazuConfig {
  repositoryUrl: string;
  projectPath: string;
  env: {
    jiraServer: string;
    jiraUser: string;
    jiraToken: string;
  };
}

interface ZazuStatus {
  status: 'unknown' | 'healthy' | 'warning' | 'error';
  message: string;
  lastCheck: Date;
}

let statusBarItem: vscode.StatusBarItem;
let zazuStatus: ZazuStatus = {
  status: 'unknown',
  message: 'Zazu not initialized',
  lastCheck: new Date()
};

export function activate(context: vscode.ExtensionContext) {
  console.log('Zazu Project Setup extension is now active!');

  // Crear status bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'zazu.showStatusMenu';
  context.subscriptions.push(statusBarItem);
  
  // Inicializar status bar
  updateStatusBar();

  // Registrar comandos
  const commands = [
    vscode.commands.registerCommand('zazu.setupProject', setupProject),
    vscode.commands.registerCommand('zazu.runDiagnosis', () => runDiagnosis()),
    vscode.commands.registerCommand('zazu.showStatusMenu', showStatusMenu),
    vscode.commands.registerCommand('zazu.openSettings', openSettings)
  ];

  commands.forEach(command => context.subscriptions.push(command));

  // Initialize status
  const config = getConfig();
  if (config.projectPath && fs.existsSync(config.projectPath)) {
    updateStatus('unknown', 'Project found, run diagnosis');
  } else {
    updateStatus('unknown', 'Project not configured');
  }
}

async function setupProject() {
  const config = getConfig();
  
  if (!config.repositoryUrl || !config.projectPath) {
    vscode.window.showErrorMessage(
      'Please configure the repository URL and project path in Zazu settings.'
    );
    openSettings();
    return;
  }

  try {
    vscode.window.showInformationMessage('🔄 Starting Zazu setup...');
    
    // 1. Check basic dependencies
    await checkDependencies();
    
    // 2. Clone repository
    await cloneRepository();
    
    // 3. Install Python dependencies
    await installPythonDependencies();
    
    // 4. Configure environment
    await configureEnvironment();
    
    // 5. Run basic test
    await runDiagnosis(true);
    
    vscode.window.showInformationMessage('✅ Zazu project setup completed!');
    
  } catch (error) {
    updateStatus('error', `Setup failed: ${error}`);
    vscode.window.showErrorMessage(`Setup failed: ${error}`);
  }
}

async function checkDependencies(): Promise<void> {
  return new Promise((resolve, reject) => {
    const dependencies = ['python3', 'pip3', 'git'];
    const results: string[] = [];
    
    const checkDep = (dep: string, index: number) => {
      const process = spawn(dep, ['--version'], { shell: true });
      
      process.on('close', (code: any) => {
        if (code === 0) {
          results.push(`✅ ${dep} installed`);
        } else {
          results.push(`❌ ${dep} not found`);
        }
        
        if (index === dependencies.length - 1) {
          const missing = results.filter(r => r.includes('❌'));
          if (missing.length > 0) {
            vscode.window.showErrorMessage(
              `Missing dependencies: ${missing.join(', ')}`
            );
            updateStatus('error', 'Dependencies missing');
            reject(new Error('Missing dependencies'));
          } else {
            vscode.window.showInformationMessage('All dependencies are installed ✅');
            updateStatus('healthy', 'Dependencies OK');
            resolve();
          }
        } else {
          checkDep(dependencies[index + 1], index + 1);
        }
      });
    };
    
    checkDep(dependencies[0], 0);
  });
}

async function cloneRepository(): Promise<void> {
  const config = getConfig();
  
  if (!config.repositoryUrl || !config.projectPath) {
    throw new Error('Repository URL or project path not configured');
  }

  const git: SimpleGit = simpleGit();
  
  // Check if directory exists and has content
  if (fs.existsSync(config.projectPath)) {
    const gitDir = path.join(config.projectPath, '.git');
    if (fs.existsSync(gitDir)) {
      // Already a git repository, try pull
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
      
      // Clear directory
      fs.rmSync(config.projectPath, { recursive: true, force: true });
    }
  }
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(config.projectPath)) {
    fs.mkdirSync(config.projectPath, { recursive: true });
  }
  
  try {
    // Clone in temporary directory and move content
    const tempDir = path.join(require('os').tmpdir(), 'zazu-clone-' + Date.now());
    await git.clone(config.repositoryUrl, tempDir);
    
    // Move content from temporary directory to target directory
    const items = fs.readdirSync(tempDir);
    for (const item of items) {
      const srcPath = path.join(tempDir, item);
      const destPath = path.join(config.projectPath, item);
      fs.renameSync(srcPath, destPath);
    }
    
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    vscode.window.showInformationMessage(`Repository cloned at: ${config.projectPath}`);
  } catch (error) {
    throw new Error(`Error cloning repository: ${error}`);
  }
}

async function installPythonDependencies(): Promise<void> {
  const config = getConfig();
  const requirementsPath = path.join(config.projectPath, 'req', 'requirements.txt');
  
  if (!fs.existsSync(requirementsPath)) {
    throw new Error('requirements.txt file not found');
  }

  return new Promise((resolve, reject) => {
    const installProcess = spawn('pip3', ['install', '-r', requirementsPath], {
      cwd: config.projectPath,
      shell: true
    });
    
    let output = '';
    
    installProcess.stdout?.on('data', (data: any) => {
      output += data.toString();
    });
    
    installProcess.stderr?.on('data', (data: any) => {
      output += data.toString();
    });
    
    installProcess.on('close', (code: any) => {
      if (code === 0) {
        vscode.window.showInformationMessage('Python dependencies installed correctly ✅');
        resolve();
      } else {
        vscode.window.showErrorMessage(`Error installing Python dependencies. Code: ${code}`);
        // Show output in a new document
        vscode.workspace.openTextDocument({
          content: output,
          language: 'plaintext'
        }).then((doc: any) => {
          vscode.window.showTextDocument(doc);
        });
        reject(new Error(`Installation failed with code: ${code}`));
      }
    });
  });
}

async function configureEnvironment(): Promise<void> {
  const config = getConfig();
  const envPath = path.join(config.projectPath, 'env', '.env');
  
  // Create basic .env content
  const envContent = `# JIRA API Configuration
JIRA_SERVER=${config.env.jiraServer}
JIRA_USER=${config.env.jiraUser}
JIRA_TOKEN=${config.env.jiraToken}
`;

  try {
    // Create env directory if it doesn't exist
    const envDir = path.dirname(envPath);
    if (!fs.existsSync(envDir)) {
      fs.mkdirSync(envDir, { recursive: true });
    }
    
    fs.writeFileSync(envPath, envContent);
    vscode.window.showInformationMessage('.env file configured');
  } catch (error) {
    throw new Error(`Error configuring .env: ${error}`);
  }
}

function getConfig(): ZazuConfig {
  const config = vscode.workspace.getConfiguration('zazu');
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  
  let projectPath = config.get('projectPath', '${workspaceFolder}');
  
  // Replace ${workspaceFolder} if necessary
  if (projectPath.includes('${workspaceFolder}')) {
    if (workspaceFolder) {
      projectPath = projectPath.replace('${workspaceFolder}', workspaceFolder);
    } else {
      projectPath = projectPath.replace('${workspaceFolder}', require('os').homedir());
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

async function runDiagnosis(silent: boolean = false): Promise<void> {
  const config = getConfig();
  
  if (!config.projectPath || !fs.existsSync(config.projectPath)) {
    const message = 'Zazu project not found. Run setup first.';
    if (!silent) {
      vscode.window.showErrorMessage(message);
    }
    updateStatus('error', message);
    return;
  }

  const diagnosticPath = path.join(config.projectPath, 'diagnosis', 'diagnostic.py');
  
  if (!fs.existsSync(diagnosticPath)) {
    const message = 'Diagnostic script not found in project.';
    if (!silent) {
      vscode.window.showErrorMessage(message);
    }
    updateStatus('error', message);
    return;
  }

  if (!silent) {
    vscode.window.showInformationMessage('Running Zazu diagnosis...');
  }

  return new Promise((resolve, reject) => {
    const process = spawn('python3', [diagnosticPath], {
      cwd: config.projectPath,
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    process.stdout?.on('data', (data: any) => {
      output += data.toString();
    });
    
    process.stderr?.on('data', (data: any) => {
      errorOutput += data.toString();
    });
    
    process.on('close', (code: any) => {
      if (code === 0) {
        const message = 'Diagnosis completed successfully ✅';
        if (!silent) {
          vscode.window.showInformationMessage(message);
          // Show output in a new document
          vscode.workspace.openTextDocument({
            content: output,
            language: 'plaintext'
          }).then((doc: any) => {
            vscode.window.showTextDocument(doc);
          });
        }
        updateStatus('healthy', 'JIRA connection OK');
        resolve();
      } else {
        const message = `Diagnosis failed. Exit code: ${code}`;
        if (!silent) {
          vscode.window.showErrorMessage(message);
          // Show error in a new document
          vscode.workspace.openTextDocument({
            content: `STDOUT:\n${output}\n\nSTDERR:\n${errorOutput}`,
            language: 'plaintext'
          }).then((doc: any) => {
            vscode.window.showTextDocument(doc);
          });
        }
        updateStatus('error', 'JIRA connection failed');
        reject(new Error(`Diagnosis failed with code: ${code}`));
      }
    });
  });
}

function updateStatus(status: 'unknown' | 'healthy' | 'warning' | 'error', message: string): void {
  zazuStatus = {
    status,
    message,
    lastCheck: new Date()
  };
  updateStatusBar();
}

function updateStatusBar(): void {
  if (!statusBarItem) {
    return;
  }
  
  const colors = {
    unknown: undefined,
    healthy: undefined,
    warning: new vscode.ThemeColor('statusBarItem.warningBackground'),
    error: new vscode.ThemeColor('statusBarItem.errorBackground')
  };
  
  statusBarItem.text = `Z`;
  statusBarItem.backgroundColor = colors[zazuStatus.status];
  statusBarItem.tooltip = `Zazu Status: ${zazuStatus.message}\nLast check: ${zazuStatus.lastCheck.toLocaleTimeString()}\n\nClick for options...`;
  statusBarItem.show();
}

function showStatus(): void {
  const statusText = `Zazu Status: ${zazuStatus.status.toUpperCase()}
Message: ${zazuStatus.message}
Last Check: ${zazuStatus.lastCheck.toLocaleString()}

Project Path: ${getConfig().projectPath || 'Not configured'}
Repository: ${getConfig().repositoryUrl}
JIRA Server: ${getConfig().env.jiraServer}`;

  vscode.window.showInformationMessage(statusText, { modal: true });
}

async function showStatusMenu(): Promise<void> {
  const config = getConfig();
  
  // Determine project status
  const projectExists = config.projectPath && fs.existsSync(config.projectPath);
  
  let statusIcon: string;
  let statusText: string;
  
  if (!projectExists) {
    statusIcon = '❌';
    statusText = 'No project configured - Use Complete Setup';
  } else if (zazuStatus.status === 'healthy') {
    statusIcon = '✅';
    statusText = 'Project ready and working';
  } else if (zazuStatus.status === 'error') {
    statusIcon = '🔥';
    statusText = 'Setup failed - Check Settings';
  } else {
    statusIcon = '⚠️';
    statusText = 'Project status unknown - Run Diagnosis Report to verify';
  }
  
  const options = [
    `Status: ${statusIcon} ${statusText}`,
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
      setupProject();
      break;
    case '📋 Diagnosis Report':
      await runDiagnosis();
      showStatus();
      break;
    case '⚙️ Settings':
      openSettings();
      break;
  }
}

function openSettings(): void {
  vscode.commands.executeCommand('workbench.action.openSettings', 'zazu');
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
  console.log('Zazu Project Setup extension deactivated');
}
