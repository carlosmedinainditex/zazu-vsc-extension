import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { simpleGit, SimpleGit } from 'simple-git';
import { spawn } from 'child_process';

interface ZazuConfig {
  repositoryUrl: string;
  projectPath: string;
  cloneMode: 'current-folder' | 'subfolder' | 'custom-path';
  env: {
    jiraServer: string;
    jiraUser: string;
    jiraToken: string;
    maxResults: number;
    defaultJql: string;
  };
  autoSetup: boolean;
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
    vscode.commands.registerCommand('zazu.checkDependencies', checkDependencies),
    vscode.commands.registerCommand('zazu.cloneRepository', cloneRepository),
    vscode.commands.registerCommand('zazu.configureEnv', configureEnvironment),
    vscode.commands.registerCommand('zazu.runDiagnosis', runDiagnosis),
    vscode.commands.registerCommand('zazu.showStatus', showStatus),
    vscode.commands.registerCommand('zazu.showStatusMenu', showStatusMenu),
    vscode.commands.registerCommand('zazu.openSettings', openSettings)
  ];

  commands.forEach(command => context.subscriptions.push(command));

  // Commented out auto-setup
  // const config = getConfig();
  // if (config.autoSetup) {
  //   vscode.window.showInformationMessage(
  //     'Zazu Project Setup is ready. Do you want to run automatic setup?',
  //     'Yes', 'No'
  //   ).then((selection: string | undefined) => {
  //     if (selection === 'Yes') {
  //       setupProject();
  //     }
  //   });
  // }

  // Check initial status if there's a configured project (only if extension activates)
  // const config = getConfig();
  // if (config.projectPath && fs.existsSync(config.projectPath)) {
  //   runDiagnosis(true); // Silent mode
  // }
}

async function setupProject() {
  const config = getConfig();
  
  if (!config.repositoryUrl || !config.projectPath) {
    vscode.window.showErrorMessage(
      'Please configure the repository URL and project path in Zazu settings.'
    );
    vscode.commands.executeCommand('workbench.action.openSettings', 'zazu');
    return;
  }

  try {
    vscode.window.showInformationMessage('🔄 Starting Zazu setup...');
    
    await checkDependencies();
    await cloneRepository();
    await installPythonDependencies();
    await configureEnvironment();
    
    vscode.window.showInformationMessage(
      'Zazu project configured successfully! 🎉',
      'Open project'
    ).then(selection => {
      if (selection === 'Open project') {
        vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(config.projectPath));
      }
    });
    
  } catch (error) {
    vscode.window.showErrorMessage(`Error during setup: ${error}`);
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
  
  if (!config.repositoryUrl) {
    throw new Error('Repository URL not configured');
  }
  
  if (!config.projectPath) {
    throw new Error('Project path not configured');
  }

  const git: SimpleGit = simpleGit();
  
  // Handle different cloning modes
  if (config.cloneMode === 'current-folder') {
    // Clone in current directory (merge with existing content)
    const isEmptyDir = !fs.existsSync(config.projectPath) || fs.readdirSync(config.projectPath).length === 0;
    
    if (!isEmptyDir) {
      // Verify if it's already a git repository
      const gitDir = path.join(config.projectPath, '.git');
      if (fs.existsSync(gitDir)) {
        // Already a git repository, try pull
        try {
          const gitRepo = simpleGit(config.projectPath);
          await gitRepo.pull();
          vscode.window.showInformationMessage('Repository updated from remote');
          return;
        } catch (error) {
          const choice = await vscode.window.showWarningMessage(
            'The directory contains a git repository but could not be updated. Reinitialize?',
            'Yes', 'No'
          );
          if (choice !== 'Yes') {
            throw new Error('Operation cancelled by user');
          }
          // Continue with cloning
        }
      }
      
      const choice = await vscode.window.showWarningMessage(
        `The directory ${config.projectPath} is not empty. How to proceed?`,
        'Clone anyway', 'Cancel'
      );
      
      if (choice !== 'Clone anyway') {
        throw new Error('Cloning cancelled by user');
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
        if (fs.existsSync(destPath)) {
          fs.rmSync(destPath, { recursive: true, force: true });
        }
        fs.renameSync(srcPath, destPath);
      }
      
      // Clean up temporary directory
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      vscode.window.showInformationMessage(`Repository cloned in current directory: ${config.projectPath}`);
      
      // Configure GitHub Copilot instructions
      await setupCopilotInstructions(config.projectPath);
    } catch (error) {
      throw new Error(`Error cloning repository in current directory: ${error}`);
    }
  } else {
    // Subfolder or custom-path mode
    if (fs.existsSync(config.projectPath)) {
      const choice = await vscode.window.showWarningMessage(
        `The folder ${config.projectPath} already exists. What do you want to do?`,
        'Overwrite', 'Use existing', 'Cancel'
      );
      
      if (choice === 'Cancel') {
        throw new Error('Cloning cancelled by user');
      }
      
      if (choice === 'Use existing') {
        vscode.window.showInformationMessage('Using existing project');
        return;
      }
      
      // Delete existing folder to overwrite
      fs.rmSync(config.projectPath, { recursive: true, force: true });
    }

    // Create parent directory if it doesn't exist
    const parentDir = path.dirname(config.projectPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    try {
      await git.clone(config.repositoryUrl, config.projectPath);
      vscode.window.showInformationMessage(`Repository cloned at: ${config.projectPath}`);
      
      // Configure GitHub Copilot instructions
      await setupCopilotInstructions(config.projectPath);
    } catch (error) {
      throw new Error(`Error cloning repository: ${error}`);
    }
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
  
  // Crear contenido del .env basado en la configuración de JIRA
  const envContent = `# JIRA API Configuration
JIRA_SERVER=${config.env.jiraServer}
# Replace with your own credentials
JIRA_USER=${config.env.jiraUser}
JIRA_TOKEN=${config.env.jiraToken}

# Optional configuration
MAX_RESULTS_PER_REQUEST=${config.env.maxResults}

# Default JQL query (initiatives)
DEFAULT_JQL=${config.env.defaultJql}
`;

  try {
    // Create env directory if it doesn't exist
    const envDir = path.dirname(envPath);
    if (!fs.existsSync(envDir)) {
      fs.mkdirSync(envDir, { recursive: true });
    }
    
    fs.writeFileSync(envPath, envContent);
    vscode.window.showInformationMessage('.env file configured correctly');
  } catch (error) {
    throw new Error(`Error configuring .env: ${error}`);
  }
}

function getConfig(): ZazuConfig {
  const config = vscode.workspace.getConfiguration('zazu');
  const cloneMode = config.get('cloneMode', 'subfolder') as 'current-folder' | 'subfolder' | 'custom-path';
  
  // Resolve project path based on cloning mode
  let projectPath: string;
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  
  switch (cloneMode) {
    case 'current-folder':
      if (workspaceFolder) {
        projectPath = workspaceFolder;
      } else {
        projectPath = require('os').homedir();
      }
      break;
      
    case 'subfolder':
      if (workspaceFolder) {
        projectPath = path.join(workspaceFolder, 'zazu-ai-assistant');
      } else {
        projectPath = path.join(require('os').homedir(), 'zazu-ai-assistant');
      }
      break;
      
    case 'custom-path':
    default:
      projectPath = config.get('projectPath', '${workspaceFolder}');
      // Replace ${workspaceFolder} if necessary
      if (projectPath.includes('${workspaceFolder}')) {
        if (workspaceFolder) {
          projectPath = projectPath.replace('${workspaceFolder}', workspaceFolder);
        } else {
          projectPath = projectPath.replace('${workspaceFolder}', require('os').homedir());
        }
      }
      break;
  }
  
  return {
    repositoryUrl: config.get('repositoryUrl', 'https://github.com/carlosmedinainditex/zazu-ai-assistant.git'),
    projectPath: projectPath,
    cloneMode: cloneMode,
    env: {
      jiraServer: config.get('env.jiraServer', 'https://jira.inditex.com/jira'),
      jiraUser: config.get('env.jiraUser', ''),
      jiraToken: config.get('env.jiraToken', ''),
      maxResults: config.get('env.maxResults', 50),
      defaultJql: config.get('env.defaultJql', 'project in (IOPCOMPRAS, IOPSOFT) AND issuetype = "Initiative" ORDER BY updated DESC')
    },
    autoSetup: config.get('autoSetup', true)
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
  const envConfigured = config.env.jiraUser && config.env.jiraToken;
  
  let statusIcon: string;
  let statusText: string;
  
  if (!projectExists) {
    statusIcon = '❌';
    statusText = 'Project not configured';
  } else if (!envConfigured) {
    statusIcon = '⚠️';
    statusText = 'Incomplete JIRA configuration';
  } else if (zazuStatus.status === 'healthy') {
    statusIcon = '✅';
    statusText = 'Everything OK - JIRA connected';
  } else if (zazuStatus.status === 'error') {
    statusIcon = '🔥';
    statusText = 'JIRA connection error';
  } else {
    statusIcon = '🔄';
    statusText = 'Unknown status';
  }
  
  const options = [
    `${statusIcon} ${statusText}`,
    '---',
    '🔧 Open Configuration',
    '🩺 Run Diagnosis',
    '📋 View Detailed Status',
    '🚀 Complete Setup',
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
  
  switch (selection) {
    case '🔧 Open Configuration':
      openSettings();
      break;
    case '🩺 Run Diagnosis':
      runDiagnosis();
      break;
    case '📋 View Detailed Status':
      showStatus();
      break;
    case '🚀 Complete Setup':
      setupProject();
      break;
  }
}

function openSettings(): void {
  vscode.commands.executeCommand('workbench.action.openSettings', 'zazu');
}

async function setupCopilotInstructions(projectPath: string): Promise<void> {
  try {
    // Look for instruction files in .github
    const githubDir = path.join(projectPath, '.github');
    if (!fs.existsSync(githubDir)) {
      return; // No .github folder, do nothing
    }
    
    // Look for copilot-instructions.md files
    const instructionsFile = path.join(githubDir, 'copilot-instructions.md');
    if (fs.existsSync(instructionsFile)) {
      // Read the content
      const content = fs.readFileSync(instructionsFile, 'utf8');
      
      // Create the file in the workspace root where Copilot can find it
      const workspaceInstructionsFile = path.join(projectPath, 'copilot-instructions.md');
      fs.writeFileSync(workspaceInstructionsFile, content);
      
      vscode.window.showInformationMessage(
        'GitHub Copilot instructions configured automatically ✅',
        'View file'
      ).then(selection => {
        if (selection === 'View file') {
          vscode.workspace.openTextDocument(workspaceInstructionsFile).then(doc => {
            vscode.window.showTextDocument(doc);
          });
        }
      });
    }
    
    // Also look in subfolders like prompts/
    const promptsDir = path.join(githubDir, 'prompts');
    if (fs.existsSync(promptsDir)) {
      const promptFiles = fs.readdirSync(promptsDir).filter(file => 
        file.endsWith('.md') && file.includes('instruction')
      );
      
      if (promptFiles.length > 0) {
        // Create .copilot directory in root if it doesn't exist
        const copilotDir = path.join(projectPath, '.copilot');
        if (!fs.existsSync(copilotDir)) {
          fs.mkdirSync(copilotDir, { recursive: true });
        }
        
        // Copy prompt files
        for (const promptFile of promptFiles) {
          const srcPath = path.join(promptsDir, promptFile);
          const destPath = path.join(copilotDir, promptFile);
          fs.copyFileSync(srcPath, destPath);
        }
        
        vscode.window.showInformationMessage(
          `${promptFiles.length} prompt files copied to .copilot/ ✅`
        );
      }
    }
    
  } catch (error) {
    console.warn('Error configuring Copilot instructions:', error);
    // Don't fail because of this, it's optional
  }
}

export function deactivate() {
  if (statusBarItem) {
    statusBarItem.dispose();
  }
  console.log('Zazu Project Setup extension deactivated');
}
