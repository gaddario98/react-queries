# `@gaddario98/react-queries`

A powerful React Hook library built on top of **TanStack React Query** and **Jotai**. It provides a unified, declarative API to manage queries, mutations, and WebSockets with baked-in global state persistence, easy caching, and auto-mapping.

## Features

- **Unified API (`useApi`)**: Manage multiple queries, mutations, and WebSockets through a single hook using a declarative configuration array.
- **Jotai Integration**: Automatically syncs query and mutation states to Jotai atoms, allowing you to access cached states across different components easily.
- **WebSocket Native Support**: Built-in support for declaring WebSockets alongside your REST endpoints, cleanly unified into the same hook.
- **Typescript First**: Strongly typed query arrays mapped perfectly to your responses, inputs, and mutations (`allQuery.yourKey.data`, `allMutation.yourMutationKey.mutate`).
- **Flexible Configuration**: Support for custom request functions, global authentication control, local or global header merging, and built-in local persistence config.
- **Backward Compatible**: Ships with standalone `useQueryApi` and `useMutateApi` hooks for simpler usage.

## Installation

```bash
yarn add @gaddario98/react-queries @tanstack/react-query jotai axios
```

_(If you are within the monorepo, it's typically aliased to `packages/react-base-core/queries` or imported as `@gaddario98/react-queries` if already built.)_

## Global Setup

Wrap your application in the `QueriesProvider`. This component initializes the TanStack `QueryClient` and (optionally) the Persist provider.

```tsx
import { QueriesProvider } from "@gaddario98/react-queries";

function App() {
  return (
    <QueriesProvider>
      <YourAppComponents />
    </QueriesProvider>
  );
}
```

### Initializing the API Configuration

The package relies on an internal `apiConfigAtom` (built using `@gaddario98/react-state`) that holds the default endpoints, network request behaviour, and query client. Before fetching, ensure your layout/app initializes this if you need custom endpoints.

You can set up multiple endpoints, define default headers, add token validators, enable query persistence, configure WebSocket connections, and even set up auto-encryption/decryption for outgoing and incoming payloads.

```tsx
import { useApiConfigState } from "@gaddario98/react-queries";
import { QueryClient } from "@tanstack/react-query";

// Setting up the base config somewhere early in your App tree
const [config, setConfig] = useApiConfigState();

useEffect(() => {
  setConfig({
    // 1. Define base endpoints here
    endpoints: {
      custom: "",
      api: "https://api.my-app.com",
      auth: "https://auth.my-app.com",
    },

    // 2. Custom fetch function (defaults to internal axios wrapper)
    requestFn: customApiRequestFn,

    // 3. Optional: global auth validation
    validateAuthFn: () => !!localStorage.getItem("token"),

    // 4. Global headers appended to all requests
    defaultHeaders: {
      "Cache-Control": "no-cache",
    },

    // 5. Tanstack global QueryClient instance
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: 2 } },
    }),

    // 6. Optional: Persister options for offline caching
    persistOptions: {
      persister: myAsyncStoragePersister,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },

    // 7. Optional: Global WebSocket Configuration
    websocketConfig: {
      url: "wss://api.my-app.com/socket",
      autoConnect: true,
      onMessage: (msg) => console.log("Global socket msg", msg),
    },

    // 8. Optional: Payload Encryption options
    encryption: {
      enabled: true,
      secretKey: "my-super-secret-key",
      encryptFn: customEncryptionFn, // Defaults to AES-GCM
      decryptFn: customDecryptionFn,
    },

    // 9. Optional: Global notification handler interface
    showNotification: ({ message, type }) => toast(message, { type }),

    // 10. Persist internal Jotai atoms holding query states (default: true)
    persistQueries: true,
  });
}, []);
```

## Basic Usage: Declarative Configurations (`useApi`)

The recommended pattern is to define an array of type `QueriesArray` consisting of your required queries, mutations, and websockets. Pass this definition to the `useApi` hook to get heavily typed state.

### 1. Define your Queries Array

```tsx
import type { QueriesArray } from "@gaddario98/react-queries";

export const myFeatureQueries = [
  {
    type: "query",
    key: "userProfile",
    queryConfig: {
      endpoint: ["api", "v1/users/me"],
      queryKey: ["user", "profile"],
      enabled: true,
      // map response from the network
      converter: (res: any) => ({ name: res.fullName }),
    },
  },
  {
    type: "mutation",
    key: "updateProfile",
    mutationConfig: {
      endpoint: ["api", "v1/users/me"],
      method: "PUT",
      queryKeyToInvalidate: ["user", "profile"],
    },
  },
] as const satisfies QueriesArray;
```

### 2. Consume in your Component

Pass your array to the `useApi` hook. Assign a `scopeId` to isolate Jotai atom keys so caching doesn't clash between different features using the same query names.

```tsx
import { useApi } from "@gaddario98/react-queries";

const MyProfileComponent = () => {
  const { allQuery, allMutation, refreshQueries } = useApi(myFeatureQueries, {
    scopeId: "profile-page",
  });

  const { data: profile, isLoading } = allQuery.userProfile;
  const updateProfileMutation = allMutation.updateProfile;

  if (isLoading) return <Spinner />;

  const handleUpdate = () => {
    updateProfileMutation.mutate({ body: { fullName: "New Name" } });
  };

  return (
    <div>
      <h1>{profile?.name}</h1>
      <button onClick={handleUpdate}>Save</button>
      <button onClick={refreshQueries}>Reload Details</button>
    </div>
  );
};
```

## Advanced Features

### WebSockets

You can manage WebSockets inside the same array!

```tsx
const queries = [
  {
    type: "websocket",
    key: "notifications",
    endpoint: "wss://api.my-app.com/socket",
    autoConnect: true,
    onMessage: (msg) => console.log("New message:", msg),
    invalidateQueriesOnMessage: ["someQueryKey"], // auto-invalidates specific queries when messages arrive!
  },
] as const satisfies QueriesArray;

// Usage:
const { allWebSocket } = useApi(queries, { scopeId: "notifications-feature" });
const { lastMessage, sendMessage, status } = allWebSocket.notifications;
```

### Fine-Grained Subscriptions (`useApiValues`)

When working with large query objects or components that only need a tiny piece of the query state (e.g., just the `isLoading` flag or a nested field in `data`), `useApiValues` helps prevent unnecessary re-renders. It subscribes to Jotai atoms but only triggers a re-render when the specific path you request changes.

```tsx
import { useApiValues } from "@gaddario98/react-queries";
import type { myFeatureQueries } from "./queries";

const LoadingIndicator = () => {
  const { get } = useApiValues<typeof myFeatureQueries>({
    scopeId: "profile-page",
  });

  // Only re-renders when `isLoading` changes, ignoring `data` or other states
  const isLoading = get("query", "userProfile.isLoading");

  if (!isLoading) return null;
  return <Spinner />;
};
```

### Standalone Hooks

If you prefer dealing with queries one by one instead of a configuration array, you can use the standalone hooks:

```tsx
import { useQueryApi, useMutateApi } from "@gaddario98/react-queries";

// Single Query
const { data, isLoading, refetch } = useQueryApi(
  {
    endpoint: ["api", "v1/stats"],
    queryKey: ["stats"],
    enabled: true,
  },
  "default-scope",
);

// Single Mutation
const mutation = useMutateApi(
  {
    endpoint: ["api", "v1/stats"],
    method: "POST",
    queryKeyToInvalidate: ["stats"],
  },
  "default-scope",
);
```

## Jotai Interoperability

Every time any query executes via `useApi` or `useQueryApi`, its result is synchronously stored in global Jotai atoms. This prevents redundant loading flashes and provides deep cache accessibility across distinct unmounted pages.

To read raw values outside a component tree or react to cross-component data without refetching, you can fetch directly from Jotai atoms via `queriesAtom` and `mutationsAtom` or use helper utilities exported by the package.
