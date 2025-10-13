import { UseQueryResult } from "@gaddario98/react-providers";
import { QueryProps, MultipleQueryResponse, QueriesArray, QueriesProps, ContextValue, QueryConfigArray } from "./types";
export declare const setValidateApi: (validate: () => boolean) => void;
export declare const useQueryApi: <TGetProps, TGetResponse>(props: Omit<QueryProps<string, TGetResponse>, "keyToMap">) => UseQueryResult<import("@tanstack/query-core").NoInfer<TGetResponse>, Error>;
export declare const useMultipleQuery: <Q extends QueriesArray>(settings?: QueryProps<Q[number]["key"], Q[number]["response"]>[]) => MultipleQueryResponse<Q>;
export declare const useMutateApi: <TProps, TResponse, TConverter = null>({ endpoint, queryKeyToInvalidate, converter, customRequest, headers, isTest, mutateOptions, method, notification, }: QueriesProps<TProps, TResponse, TConverter>) => import("@tanstack/react-query").UseMutationResult<TResponse, Error, TProps, unknown>;
export declare const useApi: <Q extends QueriesArray>(configs: QueryConfigArray<Q>) => ContextValue<Q>;
