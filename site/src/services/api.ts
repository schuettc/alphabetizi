import axios from 'axios';
import {
  SurveySubmission,
  ApiResponse,
  AppConfig,
  SurveyAnswer,
} from '../types';

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
      // Fallback for development - use relative path which will be handled by the proxy
      if (import.meta.env.DEV) {
        this.apiUrl = ''; // Empty string will use relative path with proxy
        this.configLoaded = true;
        console.log('Using proxy for API calls in development');
      }
    }
  }

  private async ensureConfigLoaded() {
    if (!this.configLoaded) {
      await this.loadConfig();
    }
  }

  async submitAnswer(answer: SurveyAnswer): Promise<ApiResponse> {
    await this.ensureConfigLoaded();

    try {
      console.log('Submitting answer:', answer);

      // Create the response object expected by the API
      const surveyResponse = {
        questionId: answer.questionId,
        selectedOption: answer.selectedOptionId,
      };

      // Use the proxy in development or the configured URL in production
      const url = this.apiUrl ? `${this.apiUrl}/survey` : '/survey';
      console.log('POST to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(surveyResponse),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', response.status, errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      return {
        success: true,
        message: 'Answer submitted successfully',
      };
    } catch (error) {
      console.error('Error submitting answer:', error);
      return {
        success: false,
        message: 'Failed to submit answer',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
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

      const url = this.apiUrl ? `${this.apiUrl}/surveys` : '/surveys';
      const response = await axios.post<ApiResponse>(url, enhancedSubmission);

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
