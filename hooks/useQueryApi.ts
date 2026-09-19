import { useQuery } from '@tanstack/react-query'
import { useSetAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { getCompositeKey, queriesAtom } from '../atoms/queryResultAtoms'
import { useApiConfigValue } from '../config'
import type { CustomQueryOptions, QueryResult } from '../types'

export const useQueryApi = <TResponse>(
  options: CustomQueryOptions<TResponse>,
  id: string = 'default',
): QueryResult<TResponse> => {
  const {
    endpoint,
    queryKey,
    enabled = true,
    headers,
    disableAuthControl,
    onDataChanged: rootOnDataChanged,
    customQueryFn,
    disableLoading,
    options: queryOptions,
    ...restOptions
  } = options

  const onDataChanged = rootOnDataChanged ?? queryOptions?.onDataChanged

  const { requestFn, validateAuthFn, defaultHeaders, endpoints } =
    useApiConfigValue()

  const fullEndpoint = useMemo(() => {
    const [key, path] = endpoint
    const baseUrl = endpoints[key]
    return [baseUrl, path].filter(Boolean).join('/')
  }, [endpoint, endpoints])

  const isLogged = useMemo(
    () => (validateAuthFn ? validateAuthFn() : true),
    [validateAuthFn],
  )
  const queryFn = useCallback(async () => {
    if (customQueryFn) {
      const res = await customQueryFn()
      return res
    }

    const mergedHeaders = {
      ...defaultHeaders,
      ...headers,
    }

    const res = await requestFn<unknown, TResponse>({
      url: fullEndpoint,
      method: 'GET',
      headers: mergedHeaders,
    })
    return res
  }, [customQueryFn, defaultHeaders, fullEndpoint, headers, requestFn])

  const enabledFinal = useMemo(() => {
    if (disableAuthControl) {
      return enabled
    }
    return enabled && isLogged
  }, [disableAuthControl, enabled, isLogged])
  const result = useQuery<TResponse, Error>({
    queryKey,
    queryFn,
    enabled: enabledFinal,
    retry: 1,
    retryDelay: 1000,
    ...queryOptions,
    ...restOptions,
  })
  const ref = useRef({
    onDataChanged,
    refetch: result.refetch,
    data: undefined as TResponse | undefined,
    dataUpdatedAt: 0,
    queryKey: '',
  })

  // Synchronous first-render notification if data is already available (e.g. persisted or cached)
  if (result.data !== undefined && onDataChanged) {
    const queryKeyStr = JSON.stringify(queryKey)
    const prevKeyStr = ref.current.queryKey
    const isNewKey = queryKeyStr !== prevKeyStr
    const currentData = result.data
    const prevData = ref.current.data
    const currentUpdatedAt = result.dataUpdatedAt
    const prevUpdatedAt = ref.current.dataUpdatedAt

    const hasChanged =
      isNewKey ||
      currentData !== prevData ||
      (currentUpdatedAt !== undefined &&
        currentUpdatedAt !== 0 &&
        currentUpdatedAt !== prevUpdatedAt)

    if (hasChanged) {
      ref.current.queryKey = queryKeyStr
      ref.current.data = currentData
      if (result.dataUpdatedAt !== undefined) {
        ref.current.dataUpdatedAt = result.dataUpdatedAt
      }
      onDataChanged(currentData)
    }
  }

  useEffect(() => {
    ref.current.onDataChanged = onDataChanged
    ref.current.refetch = result.refetch
  }, [onDataChanged, result.refetch])

  useEffect(() => {
    const currentData = result.data
    const prevData = ref.current.data
    const currentUpdatedAt = result.dataUpdatedAt
    const prevUpdatedAt = ref.current.dataUpdatedAt
    const queryKeyStr = JSON.stringify(queryKey)
    const prevKeyStr = ref.current.queryKey

    const hasDataChanged =
      currentData !== undefined &&
      (currentData !== prevData ||
        queryKeyStr !== prevKeyStr ||
        (currentUpdatedAt !== undefined &&
          currentUpdatedAt !== 0 &&
          currentUpdatedAt !== prevUpdatedAt))

    if (hasDataChanged) {
      ref.current.queryKey = queryKeyStr
      ref.current.data = currentData
      if (currentUpdatedAt !== undefined) {
        ref.current.dataUpdatedAt = currentUpdatedAt
      }
      ref.current.onDataChanged?.(currentData)
    }
  }, [result.data, result.dataUpdatedAt, queryKey])

  // Sync to Jotai atom for persistence
  const setQueriesAtom = useSetAtom(queriesAtom)
  const queryKeyStr = queryKey.join('-')
  const compositeKey = getCompositeKey(id, queryKeyStr)

  useEffect(() => {
    setQueriesAtom((prev) => ({
      ...prev,
      [compositeKey]: {
        data: result.data,
        isLoading: result.isLoading,
        isLoadingMapped: !disableLoading && result.isLoading,
        isFetching: result.isFetching,
        isPending: result.isPending,
        isSuccess: result.isSuccess,
        isError: result.isError,
        isStale: result.isStale,
        error: result.error,
        dataUpdatedAt: result.dataUpdatedAt,
        errorUpdatedAt: result.errorUpdatedAt,
        fetchStatus: result.fetchStatus,
        refetch: result.refetch,
      },
    }))
  }, [
    result.data,
    result.isLoading,
    result.isFetching,
    result.isPending,
    result.isSuccess,
    result.isError,
    result.isStale,
    result.error,
    result.dataUpdatedAt,
    result.errorUpdatedAt,
    result.fetchStatus,
    setQueriesAtom,
    compositeKey,
    disableLoading,
    result.refetch,
  ])

  return {
    data: result.data,
    isLoadingMapped: !disableLoading && result.isLoading,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isPending: result.isPending,
    error: result.error,
    refetch: () => ref.current.refetch(),
    dataUpdatedAt: result.dataUpdatedAt,
  }
}
