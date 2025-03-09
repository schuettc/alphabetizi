export interface SurveyOption {
  id: string;
  text: string;
}

export interface SurveyQuestion {
  id: string;
  question: string;
  options: SurveyOption[];
}

export interface SurveyAnswer {
  questionId: string;
  selectedOptionId: string;
}

export interface SurveySubmission {
  answers: SurveyAnswer[];
  metadata?: {
    timestamp?: string;
    userAgent?: string;
  };
}

export interface ApiResponse {
  success: boolean;
  message: string;
  id?: string;
  error?: string;
}

export interface AppConfig {
  apiUrl: string;
}
