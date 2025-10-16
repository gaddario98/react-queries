import {
  useMutation,
  useQueries,
  useQuery,
  UseQueryResult,
  queryClient,
} from "@gaddario98/react-providers";
import { endpoints } from "./endpoint";
import { useCallback, useMemo } from "react";
import { apiRequest, fetchRequest } from "./api";
import {
  QueryProps,
  MultipleQueryResponse,
  QueriesArray,
  QueriesProps,
  AllMutation,
  MutationItem,
  QueryItem,
  ContextValue,
  QueryConfigArray,
} from "./types";
import { useNotification } from "@gaddario98/react-notifications";
import { useAuthValue } from "@gaddario98/react-auth";

let validateApi = () => {
  return true;
};

export const setValidateApi = (validate: () => boolean) => {
  validateApi = validate;
};

export const useQueryApi = <TGetProps, TGetResponse>(
  props: Omit<QueryProps<string, TGetResponse>, "keyToMap">
): ReturnType<typeof useQuery<TGetResponse>> => {
  const {
    enabled,
    endpoint: endpointArr,
    queryKey,
    customQueryFn,
    headers,
    disableAuthControl,
    onDataChanged,
    options,
  } = props;
  const auth = useAuthValue();
  const [key, path] = endpointArr;
  const baseUrl = endpoints[key];
  const fullEndpoint = [baseUrl, path].filter(Boolean).join("/");
  const queryResult = useQuery<TGetResponse>({
    queryKey,
    queryFn: async () => {
      const res = await (customQueryFn?.() ??
        fetchRequest<TGetProps, TGetResponse>(fullEndpoint, {
          Authorization: auth?.token ? `Bearer ${auth?.token ?? ""}` : "",
          ...headers,
        }));
      onDataChanged?.(res);
      return res;
    },
    enabled:
      !!options?.enabled ||
      (!!enabled &&
        (disableAuthControl || (!!auth?.isLogged && validateApi()))),
    retry: 1,
    retryDelay: 1000,
    ...options,
  });
  //console.log("useQueryApi", queryResult);
  return queryResult;
};

export const useMultipleQuery = <Q extends QueriesArray>(
  settings: QueryProps<Q[number]["key"], Q[number]["response"]>[] = []
) => {
  const auth = useAuthValue();

  const results = useQueries({
    queries: useMemo(
      () =>
        settings.map(
          ({
            enabled,
            endpoint: endpointArr,
            queryKey,
            customQueryFn,
            headers,
            disableAuthControl,
            onDataChanged,
            options,
          }) => {
            const [key, path] = endpointArr;
            const baseUrl = endpoints[key];
            const fullEndpoint = [baseUrl, path].filter(Boolean).join("/");
            return {
              queryKey,
              queryFn: async () => {
                const res = await (customQueryFn?.() ??
                  fetchRequest<Q[number]["props"], Q[number]["response"]>(
                    fullEndpoint,
                    {
                      Authorization: auth?.token ? `Bearer ${auth.token}` : "",
                      ...headers,
                    }
                  ));
                onDataChanged?.(res);
                return res;
              },
              enabled:
                !!options?.enabled ||
                (!!enabled &&
                  (disableAuthControl || (!!auth?.isLogged && validateApi()))),
              retry: 1,
              retryDelay: 1000,
              ...options,
            } as Parameters<typeof useQuery>[0];
          }
        ),
      [auth, settings]
    ),
    combine: useCallback(
      (results: UseQueryResult<Q[number]["response"], Error>[]) =>
        results.reduce<MultipleQueryResponse<Q>>((prev, result, index) => {
          return {
            ...prev,
            [settings[index].keyToMap]: {
              data: result.data as Q[number]["response"],
              isLoadingMapped:
                !settings[index]?.disableLoading && result.isLoading,
              isLoading: result.isLoading,
              isFetching: result.isFetching,
              isPending: result.isPending,
            },
          };
        }, {} as MultipleQueryResponse<Q>),
      [settings]
    ),
  });

  return results;
};

export const useMutateApi = <TProps, TResponse, TConverter = null>({
  endpoint,
  queryKeyToInvalidate,
  converter,
  customRequest,
  headers,
  isTest,
  mutateOptions,
  method,
  notification,
}: QueriesProps<TProps, TResponse, TConverter>): ReturnType<
  typeof useMutation<TResponse, Error, TProps, unknown>
> => {
  const { showNotification } = useNotification();
  const auth = useAuthValue();

  type MutateOptionsType = NonNullable<
    QueriesProps<TProps, TResponse, TConverter>["mutateOptions"]
  >;
  type SuccessFn = Extract<
    MutateOptionsType["onSuccess"],
    (...args: any[]) => unknown
  >;
  type ErrorFn = Extract<
    MutateOptionsType["onError"],
    (...args: any[]) => unknown
  >;
  type SuccessParams = SuccessFn extends (...args: infer P) => unknown
    ? P
    : [TResponse, TProps, unknown, unknown];
  type ErrorParams = ErrorFn extends (...args: infer P) => unknown
    ? P
    : [Error, TProps, unknown, unknown];

  return useMutation<TResponse, Error, TProps, unknown>({
    mutationFn: async (data) => {
      if (isTest) {
        return "test" as TResponse;
      }
      if (auth?.isLogged && !validateApi())
        throw new Error("Utente non autenticato");
      return (customRequest ?? apiRequest<TProps, TResponse, TConverter>)(
        `${endpoints[endpoint[0]]}/${endpoint?.[1] ?? ""}`,
        method,
        data,
        {
          Authorization: auth?.token ? `Bearer ${auth?.token ?? ""}` : "",
          ...headers,
        },
        converter
      );
    },
    ...(mutateOptions || {}),
    onSuccess: (...args: SuccessParams) => {
      const [data] = args;
      (mutateOptions?.onSuccess as SuccessFn | undefined)?.(...args);
      queryKeyToInvalidate?.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [queryKey], exact: false });
      });
      const notificationProps =
        typeof notification?.success === "function"
          ? notification.success(data)
          : notification?.success;
      if (notificationProps?.message) {
        showNotification({
          message: notificationProps.message,
          type: notificationProps?.type ?? "success",
          ...notificationProps,
        });
      }
    },
    onError: (...args: ErrorParams) => {
      const [error] = args;
      (mutateOptions?.onError as ErrorFn | undefined)?.(...args);
      if (error?.message) {
        const notificationProps =
          typeof notification?.error === "function"
            ? notification.error(error?.message ?? "Error")
            : notification?.error;
        showNotification({
          message:
            notificationProps?.message ??
            error?.message ??
            "An unexpected error occurred",
          type: notificationProps?.type ?? "error",
          ...notificationProps,
        });
      }
    },
  });
};

export const useApi = <Q extends QueriesArray>(
  configs: QueryConfigArray<Q>
): ContextValue<Q> => {
  // Filter and prepare query configurations
  const queryItems = useMemo(
    () => configs?.filter((q): q is QueryItem<Q> => q.type === "query"),
    [configs]
  );

  const queryConfigs = useMemo(() => {
    return queryItems
      .map((item) =>
        item.queryConfig ? { ...item.queryConfig, keyToMap: item.key } : null
      )
      .filter(Boolean) as QueryProps<Q[number]["key"], Q[number]["response"]>[];
  }, [queryItems]);

  // Execute all queries with a single hook
  const queriesResult = useMultipleQuery<Q>(queryConfigs);

  // Filter mutation configs
  const mutationItems = useMemo(
    () =>
      configs?.filter(
        (q): q is MutationItem<Q> => q.type === "mutation" && !!q.mutationConfig
      ),
    [configs]
  );

  // Define a default config for empty slots
  const defaultMutationConfig = {
    endpoint: ["default"],
    method: "POST" as const,
  };

  // Create mutation hooks - each must be declared separately to follow React's rules of hooks
  const mutation1 = useMutateApi(
    mutationItems[0]?.mutationConfig || defaultMutationConfig
  );
  const mutation2 = useMutateApi(
    mutationItems[1]?.mutationConfig || defaultMutationConfig
  );
  const mutation3 = useMutateApi(
    mutationItems[2]?.mutationConfig || defaultMutationConfig
  );
  const mutation4 = useMutateApi(
    mutationItems[3]?.mutationConfig || defaultMutationConfig
  );
  const mutation5 = useMutateApi(
    mutationItems[4]?.mutationConfig || defaultMutationConfig
  );
  const mutation6 = useMutateApi(
    mutationItems[5]?.mutationConfig || defaultMutationConfig
  );
  const mutation7 = useMutateApi(
    mutationItems[6]?.mutationConfig || defaultMutationConfig
  );
  const mutation8 = useMutateApi(
    mutationItems[7]?.mutationConfig || defaultMutationConfig
  );
  const mutation9 = useMutateApi(
    mutationItems[8]?.mutationConfig || defaultMutationConfig
  );
  const mutation10 = useMutateApi(
    mutationItems[9]?.mutationConfig || defaultMutationConfig
  );

  // Store all mutation instances in an array for mapping
  const mutationInstances = useMemo(
    () => [
      mutation1,
      mutation2,
      mutation3,
      mutation4,
      mutation5,
      mutation6,
      mutation7,
      mutation8,
      mutation9,
      mutation10,
    ],
    [
      mutation1,
      mutation10,
      mutation2,
      mutation3,
      mutation4,
      mutation5,
      mutation6,
      mutation7,
      mutation8,
      mutation9,
    ]
  );

  // Map mutations to their keys
  const allMutation = useMemo(() => {
    const result = {} as AllMutation<Q>;

    mutationItems.forEach((item, index) => {
      if (index < mutationInstances.length) {
        result[item.key as keyof AllMutation<Q>] = mutationInstances[index];
      } else {
        console.warn(
          `Maximum number of mutations (${mutationInstances.length}) exceeded. Mutation "${item.key}" was not created.`
        );
      }
    });

    return result;
  }, [mutationItems, mutationInstances]);

  // Return both queries and mutations
  return { allMutation, allQuery: queriesResult };
};
