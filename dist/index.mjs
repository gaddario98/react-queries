import { useQuery, useQueries, useMutation, queryClient } from '@gaddario98/react-providers';
import { useCallback, useMemo } from 'react';
import axios from 'axios';
import { useNotification } from '@gaddario98/react-notifications';
import { useAuthValue } from '@gaddario98/react-auth';

let endpoints = {
  custom: ''
};
const setEndpoints = data => {
  endpoints = Object.assign(Object.assign({}, endpoints), data);
};

// Crea un'istanza di Axios
const apiClient = axios.create();
const url = '';
// Aggiungi un interceptor di richiesta
apiClient.interceptors.request.use(async config => {
  config.baseURL = url;
  return config;
}, async error => {
  return await Promise.reject(error);
});
apiClient.interceptors.response.use(response => {
  return response;
}, error => {
  var _a, _b;
  if (error.response) {
    throw new Error(((_a = error.response.data) === null || _a === void 0 ? void 0 : _a.message) || ((_b = error.response.data) === null || _b === void 0 ? void 0 : _b.error) || `Error ${error.response.status}`);
  } else if (error.request) {
    throw new Error('No response from server - request timeout or network issue');
  } else {
    throw new Error('Request configuration error');
  }
});
const apiRequest = async (url, method, body, headers, converter) => {
  var _a, _b;
  try {
    const data = converter && body ? converter(body) : body;
    const response = await apiClient({
      url,
      method,
      data,
      headers
    });
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
    throw new Error((_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.error) !== null && _b !== void 0 ? _b : 'Error');
  } catch (error) {
    console.error('API Request Error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
};
const fetchRequest = async (url, headers) => {
  return apiRequest(url, 'GET', undefined, headers);
};

let validateApi = () => {
  return true;
};
const setValidateApi = validate => {
  validateApi = validate;
};
const useQueryApi = props => {
  const {
    enabled,
    endpoint: endpointArr,
    queryKey,
    customQueryFn,
    headers,
    disableAuthControl,
    onDataChanged,
    options
  } = props;
  const auth = useAuthValue();
  const [key, path] = endpointArr;
  const baseUrl = endpoints[key];
  const fullEndpoint = [baseUrl, path].filter(Boolean).join("/");
  const queryResult = useQuery(Object.assign({
    queryKey,
    queryFn: async () => {
      var _a, _b;
      const res = await ((_a = customQueryFn === null || customQueryFn === void 0 ? void 0 : customQueryFn()) !== null && _a !== void 0 ? _a : fetchRequest(fullEndpoint, Object.assign({
        Authorization: (auth === null || auth === void 0 ? void 0 : auth.token) ? `Bearer ${(_b = auth === null || auth === void 0 ? void 0 : auth.token) !== null && _b !== void 0 ? _b : ""}` : ""
      }, headers)));
      onDataChanged === null || onDataChanged === void 0 ? void 0 : onDataChanged(res);
      return res;
    },
    enabled: !!(options === null || options === void 0 ? void 0 : options.enabled) || !!enabled && (disableAuthControl || !!(auth === null || auth === void 0 ? void 0 : auth.isLogged) && validateApi()),
    retry: 1,
    retryDelay: 1000
  }, options));
  //console.log("useQueryApi", queryResult);
  return queryResult;
};
const useMultipleQuery = (settings = []) => {
  const auth = useAuthValue();
  const results_0 = useQueries({
    queries: useMemo(() => settings.map(({
      enabled,
      endpoint: endpointArr,
      queryKey,
      customQueryFn,
      headers,
      disableAuthControl,
      onDataChanged,
      options
    }) => {
      const [key, path] = endpointArr;
      const baseUrl = endpoints[key];
      const fullEndpoint = [baseUrl, path].filter(Boolean).join("/");
      return Object.assign({
        queryKey,
        queryFn: async () => {
          var _a;
          const res = await ((_a = customQueryFn === null || customQueryFn === void 0 ? void 0 : customQueryFn()) !== null && _a !== void 0 ? _a : fetchRequest(fullEndpoint, Object.assign({
            Authorization: (auth === null || auth === void 0 ? void 0 : auth.token) ? `Bearer ${auth.token}` : ""
          }, headers)));
          onDataChanged === null || onDataChanged === void 0 ? void 0 : onDataChanged(res);
          return res;
        },
        enabled: !!(options === null || options === void 0 ? void 0 : options.enabled) || !!enabled && (disableAuthControl || !!(auth === null || auth === void 0 ? void 0 : auth.isLogged) && validateApi()),
        retry: 1,
        retryDelay: 1000
      }, options);
    }), [auth, settings]),
    combine: useCallback(results => results.reduce((prev, result, index) => {
      var _a_0;
      return Object.assign(Object.assign({}, prev), {
        [settings[index].keyToMap]: {
          data: result.data,
          isLoadingMapped: !((_a_0 = settings[index]) === null || _a_0 === void 0 ? void 0 : _a_0.disableLoading) && result.isLoading,
          isLoading: result.isLoading,
          isFetching: result.isFetching,
          isPending: result.isPending
        }
      });
    }, {}), [settings])
  });
  return results_0;
};
const useMutateApi = ({
  endpoint,
  queryKeyToInvalidate,
  converter,
  customRequest,
  headers,
  isTest,
  mutateOptions,
  method,
  notification
}) => {
  const {
    showNotification
  } = useNotification();
  const auth = useAuthValue();
  return useMutation(Object.assign(Object.assign({
    mutationFn: async data => {
      var _a, _b;
      if (isTest) {
        return "test";
      }
      if ((auth === null || auth === void 0 ? void 0 : auth.isLogged) && !validateApi()) throw new Error("Utente non autenticato");
      return (customRequest !== null && customRequest !== void 0 ? customRequest : apiRequest)(`${endpoints[endpoint[0]]}/${(_a = endpoint === null || endpoint === void 0 ? void 0 : endpoint[1]) !== null && _a !== void 0 ? _a : ""}`, method, data, Object.assign({
        Authorization: (auth === null || auth === void 0 ? void 0 : auth.token) ? `Bearer ${(_b = auth === null || auth === void 0 ? void 0 : auth.token) !== null && _b !== void 0 ? _b : ""}` : ""
      }, headers), converter);
    }
  }, mutateOptions || {}), {
    onSuccess: (data_0, variables, context) => {
      var _a_0, _b_0;
      (_a_0 = mutateOptions === null || mutateOptions === void 0 ? void 0 : mutateOptions.onSuccess) === null || _a_0 === void 0 ? void 0 : _a_0.call(mutateOptions, data_0, variables, context);
      queryKeyToInvalidate === null || queryKeyToInvalidate === void 0 ? void 0 : queryKeyToInvalidate.forEach(queryKey => {
        queryClient.invalidateQueries({
          queryKey: [queryKey],
          exact: false
        });
      });
      const notificationProps = typeof (notification === null || notification === void 0 ? void 0 : notification.success) === "function" ? notification.success(data_0) : notification === null || notification === void 0 ? void 0 : notification.success;
      if (notificationProps === null || notificationProps === void 0 ? void 0 : notificationProps.message) {
        showNotification(Object.assign({
          message: notificationProps.message,
          type: (_b_0 = notificationProps === null || notificationProps === void 0 ? void 0 : notificationProps.type) !== null && _b_0 !== void 0 ? _b_0 : "success"
        }, notificationProps));
      }
    },
    onError(error, variables_0, context_0) {
      var _a_1, _b_1, _c, _d, _e;
      (_a_1 = mutateOptions === null || mutateOptions === void 0 ? void 0 : mutateOptions.onError) === null || _a_1 === void 0 ? void 0 : _a_1.call(mutateOptions, error, variables_0, context_0);
      if (error === null || error === void 0 ? void 0 : error.message) {
        const notificationProps_0 = typeof (notification === null || notification === void 0 ? void 0 : notification.error) === "function" ? notification.error((_b_1 = error === null || error === void 0 ? void 0 : error.message) !== null && _b_1 !== void 0 ? _b_1 : "Error") : notification === null || notification === void 0 ? void 0 : notification.error;
        showNotification(Object.assign({
          message: (_d = (_c = notificationProps_0 === null || notificationProps_0 === void 0 ? void 0 : notificationProps_0.message) !== null && _c !== void 0 ? _c : error === null || error === void 0 ? void 0 : error.message) !== null && _d !== void 0 ? _d : "An unexpected error occurred",
          type: (_e = notificationProps_0 === null || notificationProps_0 === void 0 ? void 0 : notificationProps_0.type) !== null && _e !== void 0 ? _e : "error"
        }, notificationProps_0));
      }
    }
  }));
};
const useApi = configs => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
  // Filter and prepare query configurations
  const queryItems = useMemo(() => configs === null || configs === void 0 ? void 0 : configs.filter(q => q.type === "query"), [configs]);
  const queryConfigs = useMemo(() => {
    return queryItems.map(item => item.queryConfig ? Object.assign(Object.assign({}, item.queryConfig), {
      keyToMap: item.key
    }) : null).filter(Boolean);
  }, [queryItems]);
  // Execute all queries with a single hook
  const queriesResult = useMultipleQuery(queryConfigs);
  // Filter mutation configs
  const mutationItems = useMemo(() => configs === null || configs === void 0 ? void 0 : configs.filter(q_0 => q_0.type === "mutation" && !!q_0.mutationConfig), [configs]);
  // Define a default config for empty slots
  const defaultMutationConfig = {
    endpoint: ["default"],
    method: "POST"
  };
  // Create mutation hooks - each must be declared separately to follow React's rules of hooks
  const mutation1 = useMutateApi(((_a = mutationItems[0]) === null || _a === void 0 ? void 0 : _a.mutationConfig) || defaultMutationConfig);
  const mutation2 = useMutateApi(((_b = mutationItems[1]) === null || _b === void 0 ? void 0 : _b.mutationConfig) || defaultMutationConfig);
  const mutation3 = useMutateApi(((_c = mutationItems[2]) === null || _c === void 0 ? void 0 : _c.mutationConfig) || defaultMutationConfig);
  const mutation4 = useMutateApi(((_d = mutationItems[3]) === null || _d === void 0 ? void 0 : _d.mutationConfig) || defaultMutationConfig);
  const mutation5 = useMutateApi(((_e = mutationItems[4]) === null || _e === void 0 ? void 0 : _e.mutationConfig) || defaultMutationConfig);
  const mutation6 = useMutateApi(((_f = mutationItems[5]) === null || _f === void 0 ? void 0 : _f.mutationConfig) || defaultMutationConfig);
  const mutation7 = useMutateApi(((_g = mutationItems[6]) === null || _g === void 0 ? void 0 : _g.mutationConfig) || defaultMutationConfig);
  const mutation8 = useMutateApi(((_h = mutationItems[7]) === null || _h === void 0 ? void 0 : _h.mutationConfig) || defaultMutationConfig);
  const mutation9 = useMutateApi(((_j = mutationItems[8]) === null || _j === void 0 ? void 0 : _j.mutationConfig) || defaultMutationConfig);
  const mutation10 = useMutateApi(((_k = mutationItems[9]) === null || _k === void 0 ? void 0 : _k.mutationConfig) || defaultMutationConfig);
  // Store all mutation instances in an array for mapping
  const mutationInstances = useMemo(() => [mutation1, mutation2, mutation3, mutation4, mutation5, mutation6, mutation7, mutation8, mutation9, mutation10], [mutation1, mutation10, mutation2, mutation3, mutation4, mutation5, mutation6, mutation7, mutation8, mutation9]);
  // Map mutations to their keys
  const allMutation = useMemo(() => {
    const result = {};
    mutationItems.forEach((item_0, index) => {
      if (index < mutationInstances.length) {
        result[item_0.key] = mutationInstances[index];
      } else {
        console.warn(`Maximum number of mutations (${mutationInstances.length}) exceeded. Mutation "${item_0.key}" was not created.`);
      }
    });
    return result;
  }, [mutationItems, mutationInstances]);
  // Return both queries and mutations
  return {
    allMutation,
    allQuery: queriesResult
  };
};

export { endpoints, setEndpoints, setValidateApi, useApi, useMultipleQuery, useMutateApi, useQueryApi };
//# sourceMappingURL=index.mjs.map
