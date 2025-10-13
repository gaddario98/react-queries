/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosRequestConfig } from "axios";
import { Endpoint } from "./endpoint";
import {  useMutation, useQuery } from "@gaddario98/react-providers";
import { NotificationConfig } from "@gaddario98/react-notifications";

// Estrarre MutateOptions usando il tipo di ritorno di useMutation
type MutateOptions<TData, TError, TVariables, TContext> = Parameters<
  ReturnType<typeof useMutation<TData, TError, TVariables, TContext>>["mutate"]
>[1];

type HttpMethod = "POST" | "PUT" | "DELETE";
export interface QueriesProps<TProps, TResponse, TConverter = null> {
  endpoint: [keyof Endpoint, string] | [keyof Endpoint];
  queryKeyToInvalidate?: string[];
  headers?: AxiosRequestConfig["headers"];
  method: HttpMethod;
  converter?: (props: TProps) => TConverter;
  customRequest?: (
    url: string,
    method: string,
    data: TProps
  ) => Promise<TResponse>;
  mutateOptions?: MutateOptions<TResponse, Error, TProps, unknown>;
  isTest?: boolean;
  notification?: {
    success?: NotificationConfig | ((res: TResponse) => NotificationConfig);
    error?: NotificationConfig | ((error: string) => NotificationConfig);
    translationOption?: Record<string, any>;
  };
}

export interface QueryProps<Key extends string, TResponse> {
  endpoint: [keyof Endpoint, string] | [keyof Endpoint];
  queryKey: string[];
  enabled: boolean;
  keyToMap: Key;
  disableLoading?: boolean;
  customQueryFn?: () => Promise<TResponse>;
  headers?: AxiosRequestConfig["headers"];
  disableAuthControl?: boolean;
  onDataChanged?: (data: TResponse) => void;
  options?: Omit<
    Parameters<typeof useQuery<TResponse>>["0"],
    "queryKey" | "queryFn"
  >;
}

export type MultipleQueryResponse<Q extends QueriesArray> = {
  [K in ExtractQuery<Q>["key"]]: {
    data: ExtractQueryResponse<Q, K>["response"];
    isLoading: boolean;
    isLoadingMapped: boolean;
    isFetching: boolean;
    isPending: boolean;
  };
};

export type QueryDefinition<
  K extends string,
  T extends "query" | "mutation",
  P,
  R,
  C = any,
> = { key: K; props: P; response: R; converter: C; type: T };
export type QueriesArray = Array<QueryDefinition<string, any, any, any, any>>;

export type ExtractQuery<Q extends QueriesArray> = Extract<
  Q[number],
  { type: "query" }
>;

export type ExtractQueryResponse<
  Q extends QueriesArray,
  K extends Q[number]["key"],
> = Extract<Q[number], { key: K }>;
export type ExtractMutation<Q extends QueriesArray> = Extract<
  Q[number],
  { type: "mutation" }
>;

export type AllMutation<Q extends QueriesArray = QueriesArray> = {
  [K in ExtractMutation<Q>["key"]]: ReturnType<typeof useMutation<
    ExtractQueryResponse<Q, K>["response"],
    Error,
    ExtractQueryResponse<Q, K>["props"],
    unknown
  >>;
};
export interface MutationConfig<
  TProps = unknown,
  TResponse = unknown,
  TConverter = any,
> extends QueriesProps<TProps, TResponse, TConverter> {
  method: "POST" | "PUT" | "DELETE";
}

// Utility type per estrarre il tipo corretto di QueryConfig per una singola query
export type SingleQueryConfig<Q extends QueryDefinition<any, any, any, any>> =
  Q extends QueryDefinition<infer K, infer T, infer P, infer R, infer C>
    ? T extends "mutation"
      ? { type: "mutation"; mutationConfig: MutationConfig<P, R, C>; key: K }
      : {
          type: "query";
          queryConfig?: Omit<QueryProps<K, R>, "keyToMap">;
          key: K;
        }
    : never;

export type QueryAtIndex<Q extends QueriesArray, I extends keyof Q> =
  Q[I] extends QueryDefinition<infer K, infer T, infer P, infer R, infer C>
    ? QueryDefinition<K, T, P, R, C>
    : never;

// Type per mappare gli indici dell'array alle query config corrette
export type QueryConfigArray<Q extends QueriesArray> = {
  [I in keyof Q]: SingleQueryConfig<QueryAtIndex<Q, I>>;
};

export interface ContextValue<Q extends QueriesArray> {
  allMutation: AllMutation<Q>;
  allQuery: MultipleQueryResponse<Q>;
}

// Type for mutation configuration
export type MutationItem<Q extends QueriesArray> = Extract<
  QueryConfigArray<Q>[number],
  { type: "mutation"; mutationConfig: any }
>;

// Type for query configuration
export type QueryItem<Q extends QueriesArray> = Extract<
  QueryConfigArray<Q>[number],
  { type: "query" }
>;
