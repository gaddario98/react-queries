import { AxiosRequestConfig } from 'axios';
type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiConverter<TProps, TConverter> = (props: TProps) => TConverter;
declare const apiRequest: <TProps, TResponse, TConverter = TProps>(url: string, method: ApiMethod, body?: TProps, headers?: AxiosRequestConfig["headers"], converter?: ApiConverter<TProps, TConverter>) => Promise<TResponse>;
declare const fetchRequest: <TProps, TResponse, TConverter = TProps>(url: string, headers?: AxiosRequestConfig["headers"]) => Promise<TResponse>;
export { fetchRequest, apiRequest };
export type { ApiMethod, ApiConverter };
