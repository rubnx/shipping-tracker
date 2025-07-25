import axios from 'axios';

type AxiosInstance = typeof axios;
type AxiosRequestConfig = Parameters<typeof axios.request>[0];
type AxiosResponse<T = any> = Awaited<ReturnType<typeof axios.get<T>>>;
type AxiosError = any;

/**
 * API Client service with proper connection handling
 * Implements Requirements 5.3, 5.4, 7.4 for API connection management
 */

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  userMessage: string;
  statusCode: number;
  retryable: boolean;
  retryAfter?: number;
}

export interface ConnectionStatus {
  online: boolean;
  apiReachable: boolean;
  lastChecked: Date;
  latency?: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private config: ApiClientConfig;
  private connectionStatus: ConnectionStatus;
  private retryQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
      retryAttempts: 3,
      retryDelay: 1000,
      enableLogging: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true',
      ...config,
    };

    this.connectionStatus = {
      online: navigator.onLine,
      apiReachable: true,
      lastChecked: new Date(),
    };

    this.client = this.createAxiosInstance();
    this.setupInterceptors();
    this.setupConnectionMonitoring();
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add request timestamp for latency calculation
        config.metadata = { startTime: Date.now() };
        
        if (this.config.enableLogging) {
          console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
      },
      (error) => {
        if (this.config.enableLogging) {
          console.error('❌ API Request Error:', error);
        }
        return Promise.reject(this.transformError(error));
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Calculate latency
        const latency = Date.now() - response.config.metadata?.startTime;
        this.updateConnectionStatus(true, latency);

        if (this.config.enableLogging) {
          console.log(`✅ API Response: ${response.status} ${response.config.url} (${latency}ms)`);
        }

        return response;
      },
      async (error) => {
        const latency = error.config?.metadata?.startTime 
          ? Date.now() - error.config.metadata.startTime 
          : undefined;

        if (this.config.enableLogging) {
          console.error(`❌ API Error: ${error.response?.status || 'Network'} ${error.config?.url} (${latency}ms)`);
        }

        // Update connection status
        this.updateConnectionStatus(false, latency);

        // Handle retry logic
        if (this.shouldRetry(error)) {
          return this.retryRequest(error);
        }

        return Promise.reject(this.transformError(error));
      }
    );
  }

  private setupConnectionMonitoring(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      console.log('🌐 Connection restored');
      this.connectionStatus.online = true;
      this.processRetryQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connection lost');
      this.connectionStatus.online = false;
    });

    // Periodic health check
    setInterval(() => {
      this.checkApiHealth();
    }, 30000); // Check every 30 seconds
  }

  private updateConnectionStatus(apiReachable: boolean, latency?: number): void {
    this.connectionStatus = {
      online: navigator.onLine,
      apiReachable,
      lastChecked: new Date(),
      latency,
    };
  }

  private shouldRetry(error: AxiosError): boolean {
    // Don't retry if offline
    if (!this.connectionStatus.online) {
      return false;
    }

    // Don't retry client errors (4xx)
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      return false;
    }

    // Retry network errors and server errors (5xx)
    return !error.response || error.response.status >= 500;
  }

  private async retryRequest(error: AxiosError): Promise<AxiosResponse> {
    const config = error.config;
    if (!config) {
      throw this.transformError(error);
    }

    // Initialize retry count
    config.retryCount = config.retryCount || 0;

    // Check if we've exceeded retry attempts
    if (config.retryCount >= this.config.retryAttempts) {
      throw this.transformError(error);
    }

    // Increment retry count
    config.retryCount++;

    // Calculate delay with exponential backoff
    const delay = this.config.retryDelay * Math.pow(2, config.retryCount - 1);

    if (this.config.enableLogging) {
      console.log(`🔄 Retrying request (${config.retryCount}/${this.config.retryAttempts}) in ${delay}ms`);
    }

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));

    // Retry the request
    return this.client.request(config);
  }

  private transformError(error: any): ApiError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      // Network error
      if (!axiosError.response) {
        return {
          code: 'NETWORK_ERROR',
          message: 'Network connection failed',
          userMessage: 'Unable to connect to the server. Please check your internet connection.',
          statusCode: 0,
          retryable: true,
        };
      }

      // Server error
      const response = axiosError.response;
      const data = response.data as any;

      return {
        code: data?.code || `HTTP_${response.status}`,
        message: data?.error || axiosError.message,
        userMessage: data?.error || this.getDefaultErrorMessage(response.status),
        statusCode: response.status,
        retryable: response.status >= 500,
        retryAfter: this.parseRetryAfter(response.headers['retry-after']),
      };
    }

    // Generic error
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      userMessage: 'Something went wrong. Please try again.',
      statusCode: 500,
      retryable: true,
    };
  }

  private getDefaultErrorMessage(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'Access denied. You don\'t have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
        return 'Service temporarily unavailable. Please try again later.';
      case 503:
        return 'Service maintenance in progress. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  private parseRetryAfter(retryAfter?: string): number | undefined {
    if (!retryAfter) return undefined;
    
    const seconds = parseInt(retryAfter, 10);
    return isNaN(seconds) ? undefined : seconds;
  }

  private async processRetryQueue(): Promise<void> {
    if (this.isProcessingQueue || this.retryQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.retryQueue.length > 0) {
      const request = this.retryQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Failed to process queued request:', error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  private async checkApiHealth(): Promise<void> {
    try {
      const startTime = Date.now();
      await this.client.get('/health', { timeout: 5000 });
      const latency = Date.now() - startTime;
      this.updateConnectionStatus(true, latency);
    } catch (error) {
      this.updateConnectionStatus(false);
    }
  }

  // Public API methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Connection status methods
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  isOnline(): boolean {
    return this.connectionStatus.online;
  }

  isApiReachable(): boolean {
    return this.connectionStatus.apiReachable;
  }

  getLatency(): number | undefined {
    return this.connectionStatus.latency;
  }

  // Queue request for when connection is restored
  queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.retryQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      // Process queue immediately if online
      if (this.connectionStatus.online) {
        this.processRetryQueue();
      }
    });
  }

  // Manual health check
  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      await this.client.get('/health', { timeout: 5000 });
      const latency = Date.now() - startTime;
      
      return {
        healthy: true,
        latency,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export types
export type { ApiClientConfig, ApiError, ConnectionStatus };