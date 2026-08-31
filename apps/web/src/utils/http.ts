import { Message } from '@/components/msg';
import { MessageBox} from '@/components/msgbox/';
import { useAuthStore } from '@/stores/modules/auth';
import { omit } from 'lodash-es';

export type ErrorMessageMode = 'none' | 'modal' | 'message' | 'console' | undefined;
export type SuccessMessageMode = ErrorMessageMode;

export interface RetryRequest {
  isOpenRetry: boolean;
  count: number;
  waitTime: number;
}

export class HttpOptions {
  // Whether to process the request result
  transformResponse?: boolean = true;
  // Whether to return native response headers
  // For example: use this attribute when you need to get the response headers
  returnNativeResponse?: boolean = false;
  // Whether to join url
  joinPrefix?: boolean = true;
  // Interface address, use the default apiUrl if you leave it blank
  apiUrl?: string = '/api';
  // URL prefix
  urlPrefix?: string;
  // Error message prompt type
  errorMessageMode?: ErrorMessageMode = 'message';
  // Success message prompt type
  successMessageMode?: SuccessMessageMode;
  // Whether to add a timestamp
  joinTime?: boolean = true;
  // Whether to send token in header
  withToken?: boolean = true;
}

export interface RequestOptions {
  /** request URL */
  url: string;
  /** request method */
  method?: string;
  /** request body */
  data?: any;
  /** request query parameters */
  params?: Record<string, any>;
  /** request headers */
  headers?: Record<string, any>;
  /** request timeout */
  timeout?: number;
}

class Http {
  private options: HttpOptions;
  constructor(options: HttpOptions = new HttpOptions()) {
    this.options = options;
  }

  public get<T = any>(options: RequestOptions, config?: HttpOptions): Promise<T> {
    const requestOptions = { ...omit(options, ['data']), method: 'GET' };
    return this.request<T>(requestOptions, config);
  }

  public post<T = any>(options: RequestOptions, config?: HttpOptions): Promise<T> {
    return this.request<T>({ ...options, method: 'POST' }, config);
  }

  public put<T = any>(options: RequestOptions, config?: HttpOptions): Promise<T> {
    return this.request<T>({ ...options, method: 'PUT' }, config);
  }

  public delete<T = any>(options: RequestOptions, config?: HttpOptions): Promise<T> {
    return this.request<T>({ ...options, method: 'DELETE' }, config);
  }

  private request<T = any>(options: RequestOptions, config?: HttpOptions): Promise<T> {
    // 使用 fetch 实现请求
    const { url, data, params, headers, timeout } = options;
    const cfg = { ...this.options, ...config };

    let apiUrl = url;

    if (cfg.urlPrefix) {
      apiUrl = cfg.urlPrefix + apiUrl;
    }

    if (cfg.apiUrl && cfg.joinPrefix) {
      apiUrl = cfg.apiUrl + apiUrl;
    }

    const controller = new AbortController();
    const signal = controller.signal;
    const fetchOptions = {
      method: options.method,
      headers: { ...headers, 'Content-Type': 'application/json' } as any,
      body: data ? JSON.stringify(data) : undefined,
      signal,
    };

    const queryString = params
      ? (apiUrl.includes('?') ? '&' : '?') 
      + new URLSearchParams(params).toString()
      : '';

    apiUrl = apiUrl + queryString;

    if (cfg.joinTime) {
      const timestamp = Date.now();
      const separator = apiUrl.includes('?') ? '&' : '?';
      apiUrl = `${apiUrl}${separator}t=${timestamp}`;
    }

    if (cfg.withToken) {
      const token = useAuthStore().getToken;
      if (token) {
        fetchOptions.headers.Authorization = `Bearer ${token}`;
      }
    }

    let timeoutId: ReturnType<typeof setTimeout>;
    const fetchPromise = fetch(apiUrl, fetchOptions).then(
      async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || '请求失败');
        }
        if (cfg.returnNativeResponse) {
          return response;
        }
        const res = await response.json();
        if (!cfg.transformResponse) {
          return res;
        }
        if (res.code !== 0) {
          throw new Error(res.msg || '请求失败');
        }
        return res.data;
      }
    ).catch((error) => {
      if (cfg.errorMessageMode === 'message') {
        Message.error(error.message);
      } else if (cfg.errorMessageMode === 'modal') {
        MessageBox.alert(error.message);
      } else if (cfg.errorMessageMode === 'console') {
        console.log(error.message);
      }
      throw error;
    }).finally(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    });

    if (timeout) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          controller.abort();
          reject(new Error('请求超时'));
        }, timeout);
      });
      return Promise.race([fetchPromise, timeoutPromise]);
    }

    return fetchPromise;
  }
}

export const http = new Http();
export default http;
