import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useApiConfigValue } from "../config";
import type { PropsWithChildren } from "react";

export const QueriesProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { queryClient, persistOptions } = useApiConfigValue();

  if (persistOptions?.persister) {
    return (
      <PersistQueryClientProvider
        // @ts-expect-error Type mismatch
        client={queryClient}
        // @ts-expect-error Type mismatch
        persistOptions={persistOptions}
      >
        {/* @ts-expect-error Type mismatch */}
        {children}
      </PersistQueryClientProvider>
    );
  }

  return (
    <QueryClientProvider 
      // @ts-expect-error Type mismatch
      client={queryClient}
    >
      {/* @ts-expect-error Type mismatch */}
      {children}
    </QueryClientProvider>
  );
};
