import axios from 'axios';
import { SurveySubmission, ApiResponse, AppConfig } from '../types';

class ApiService {
  private apiUrl: string = '';
  private configLoaded: boolean = false;

  constructor() {
    this.loadConfig();
  }

  private async loadConfig() {
    try {
      // In development, we can use relative path
      const configUrl = import.meta.env.DEV ? '/config.json' : '/config.json';
      const response = await axios.get<AppConfig>(configUrl);
      this.apiUrl = response.data.apiUrl;
      this.configLoaded = true;
      console.log('API URL configured:', this.apiUrl);
    } catch (error) {
      console.error('Failed to load config.json:', error);
      // Fallback for development
      if (import.meta.env.DEV) {
        this.apiUrl = 'http://localhost:3000';
        this.configLoaded = true;
      }
    }
  }

  private async ensureConfigLoaded() {
    if (!this.configLoaded) {
      await this.loadConfig();
    }
  }

  async submitSurvey(submission: SurveySubmission): Promise<ApiResponse> {
    await this.ensureConfigLoaded();

    try {
      // Add timestamp and user agent to metadata
      const enhancedSubmission: SurveySubmission = {
        ...submission,
        metadata: {
          ...submission.metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        },
      };

      const response = await axios.post<ApiResponse>(
        `${this.apiUrl}/surveys`,
        enhancedSubmission,
      );

      return response.data;
    } catch (error) {
      console.error('Error submitting survey:', error);
      return {
        success: false,
        message: 'Failed to submit survey',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const apiService = new ApiService();
