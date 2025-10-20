/**
 * Configuration interface for Zazu extension
 */
export interface ZazuConfig {
  repositoryUrl: string;
  projectPath: string;
  env: {
    jiraServer: string;
    jiraUser: string;
    jiraToken: string;
  };
}

/**
 * Status interface for tracking project state
 */
export interface ZazuStatus {
  status: 'unknown' | 'healthy' | 'warning' | 'error';
  message: string;
  lastCheck: Date;
}

/**
 * Project status interface for UI display
 */
export interface ProjectStatus {
  icon: string;
  text: string;
}

/**
 * System dependencies that need to be checked
 */
export const SYSTEM_DEPENDENCIES = ['python3', 'pip3', 'git'] as const;

/**
 * Required project files for validation
 */
export const REQUIRED_PROJECT_FILES = {
  requirements: 'req/requirements.txt',
  diagnostic: 'diagnosis/diagnostic.py',
  env: 'env/.env'
} as const;
