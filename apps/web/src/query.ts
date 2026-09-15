import { QueryClient } from "@tanstack/react-query"

/**
 * The application's one query client, with the defaults ADR 017 records for a field in
 * Poland: answers stay fresh for a day, survive in memory for thirty, and a query fires
 * even when the browser believes it is offline, because a webview's guess about a camp
 * site's connectivity is not to be trusted. Nothing refetches on mount, focus, or
 * reconnect – data this application reads changes on a human timescale.
 *
 * Every service read goes through this client – the gate hands it to `currentUser`, and
 * the screens' hooks will mount it in a provider when the first one arrives – so one
 * cache holds every answer. There is no persister and no cache owner yet: the cache is
 * in-memory on purpose, so a change of signed-in person is a full-page navigation that
 * discards it whole, and nothing of one session can survive into the next.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 30 * 24 * 60 * 60 * 1000,
      networkMode: "offlineFirst",
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 24 * 60 * 60 * 1000,
    },
  },
})
