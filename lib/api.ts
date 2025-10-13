import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiConverter<TProps, TConverter> = (props: TProps) => TConverter;

// Crea un'istanza di Axios
const apiClient = axios.create();
const url = '';

// Aggiungi un interceptor di richiesta
apiClient.interceptors.request.use(
  async (config) => {
    config.baseURL = url;
    return config;
  },
  async (error) => {
    return await Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      throw new Error(
        error.response.data?.message ||
          error.response.data?.error ||
          `Error ${error.response.status}`,
      );
    } else if (error.request) {
      throw new Error(
        'No response from server - request timeout or network issue',
      );
    } else {
      throw new Error('Request configuration error');
    }
  },
);

const apiRequest = async <TProps, TResponse, TConverter = TProps>(
  url: string,
  method: ApiMethod,
  body?: TProps,
  headers?: AxiosRequestConfig['headers'],
  converter?: ApiConverter<TProps, TConverter>,
): Promise<TResponse> => {
  try {
    const data = converter && body ? converter(body) : body;
    const response: AxiosResponse<TResponse & { error?: string }> =
      await apiClient({
        url,
        method,
        data,
        headers,
      });

    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }

    throw new Error(response.data?.error ?? 'Error');
  } catch (error) {
    console.error('API Request Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
};

const fetchRequest = async <TProps, TResponse, TConverter = TProps>(
  url: string,
  headers?: AxiosRequestConfig['headers'],
): Promise<TResponse> => {
  return apiRequest<TProps, TResponse, TConverter>(url, 'GET', undefined, headers);
};

export { fetchRequest, apiRequest };
export type { ApiMethod, ApiConverter };
