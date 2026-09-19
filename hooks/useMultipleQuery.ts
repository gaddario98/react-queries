import { useIsRestoring, useQueries } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useApiConfigValue } from "../config";
import type { MultipleQueryResponse, QueriesArray, QueryProps } from "../types";
import type { UseQueryResult } from "@tanstack/react-query";

export const useMultipleQuery = <Q extends QueriesArray>(
  settings: Array<QueryProps<Q[number]["key"], Q[number]["response"]>> = [],
) => {
  const { requestFn, validateAuthFn, defaultHeaders, queryClient, endpoints } =
    useApiConfigValue();
  const isRestoring = useIsRestoring();

  const generateEndpoint = useCallback(
    (endpoint: [string, string] | [string]) => {
      const [key, path] = endpoint;
      const baseUrl = endpoints[key];
      return [baseUrl, path].filter(Boolean).join("/");
    },
    [endpoints],
  );
  const isLogged = useMemo(
    () => (validateAuthFn ? validateAuthFn() : true),
    [validateAuthFn],
  );

  const generateQueryFn = useCallback(
    async ({
      endpoint,
      customQueryFn,
      headers,
    }: QueryProps<Q[number]["key"], Q[number]["response"]>) => {
      const fullEndpoint = generateEndpoint(endpoint);

      if (customQueryFn) {
        const res = await customQueryFn();
        return res;
      }

      const mergedHeaders = {
        ...defaultHeaders,
        ...headers,
      };

      return await requestFn({
        url: fullEndpoint,
        method: "GET",
        headers: mergedHeaders,
      });
    },
    [defaultHeaders, generateEndpoint, requestFn],
  );

  const ref = useRef({
    data: {} as Record<Q[number]["key"], Q[number]["response"]>,
    dataUpdatedAt: {} as Record<string, number>,
    queryKeys: {} as Record<string, string>,
    results: {} as Record<
      string,
      MultipleQueryResponse<Q>[keyof MultipleQueryResponse<Q>]
    >,
  });

  const queries = useMemo(() => {
    return settings.map((setting) => {
      const {
        queryKey,
        enabled = true,
        disableAuthControl,
        options: queryOptions,
        ...rest
      } = setting;

      return {
        queryKey,
        queryFn: () => generateQueryFn(setting),
        enabled: !!enabled && (disableAuthControl || !!isLogged),
        ...queryOptions,
        ...rest,
      };
    });
  }, [settings, isLogged, generateQueryFn]);

  const combine = useCallback(
    (results: Array<UseQueryResult<Q[number]["response"], Error>>) => {
      return results.reduce<MultipleQueryResponse<Q>>((prev, result, index) => {
        const setting = settings[index];
        if (!setting) return prev;

        const keyToMap = setting.keyToMap;
        Object.assign(prev, {
          [keyToMap]: {
            data: result.data as Q[number]["response"],
            isLoadingMapped: !setting.disableLoading && result.isLoading,
            isLoading: result.isLoading,
            isFetching: result.isFetching,
            isPending: result.isPending,
            error: result.error,
            refetch: result.refetch,
            dataUpdatedAt: result.dataUpdatedAt,
          },
        });

        return prev;
      }, {} as MultipleQueryResponse<Q>);
    },
    [settings],
  );

  const result = useQueries(
    {
      queries,
      combine,
    },
    queryClient,
  );

  useEffect(() => {
    if (isRestoring) return;

    settings.forEach((setting) => {
      const { keyToMap, queryKey } = setting;
      const onDataChanged =
        setting.onDataChanged ?? setting.options?.onDataChanged;
      const onStateChange =
        setting.onStateChange ?? setting.options?.onStateChange;

      if (!onDataChanged && !onStateChange) return;

      const currentResult = result[keyToMap];
      if (!currentResult) return;
      const prevResult = ref.current.results[keyToMap];

      // Handle onStateChange
      if (onStateChange) {
        if (
          !prevResult ||
          prevResult.data !== currentResult.data ||
          prevResult.isLoading !== currentResult.isLoading ||
          prevResult.isLoadingMapped !== currentResult.isLoadingMapped ||
          prevResult.isFetching !== currentResult.isFetching ||
          prevResult.isPending !== currentResult.isPending ||
          prevResult.error !== currentResult.error
        ) {
          ref.current.results[keyToMap] = currentResult;
          onStateChange(currentResult);
        }
      }

      // Handle onDataChanged (Legacy support + specific data changes)
      if (onDataChanged) {
        const currentData = currentResult.data;
        const prevData = ref.current.data[keyToMap];
        const currentUpdatedAt = currentResult.dataUpdatedAt;
        const prevUpdatedAt = ref.current.dataUpdatedAt[keyToMap];
        const queryKeyStr = JSON.stringify(queryKey);
        const prevKeyStr = ref.current.queryKeys[keyToMap];

        const hasDataChanged =
          currentData !== undefined &&
          (currentData !== prevData ||
            queryKeyStr !== prevKeyStr ||
            (currentUpdatedAt !== undefined &&
              currentUpdatedAt !== 0 &&
              currentUpdatedAt !== prevUpdatedAt));

        if (hasDataChanged) {
          ref.current.queryKeys[keyToMap] = queryKeyStr;
          ref.current.data[keyToMap] = currentData;
          if (currentUpdatedAt !== undefined) {
            ref.current.dataUpdatedAt[keyToMap] = currentUpdatedAt;
          }
          onDataChanged(currentData);
        }
      }
    });
  }, [isRestoring, result, settings]);

  return result;
};
