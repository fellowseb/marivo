import superjson from 'superjson';
import { v7 as uuidv7 } from 'uuid';
import { StrictMode, useState } from 'react';
import 'keyboard-css/dist/css/main.min.css';
import { BrowserRouter } from 'react-router';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpLink, TRPCClientError } from '@trpc/client';
import type { AppRouter } from '@marivo/api';
import Routes from './routes.tsx';
import './app.css';
import { TRPCProvider } from './trpc.ts';
import { NotificationsContextProvider } from './components/notifications.context.tsx';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (
            error instanceof TRPCClientError &&
            error.data.code === 'NOT_FOUND'
          ) {
            return false;
          }
          return failureCount < 4;
        },
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

interface TrpcApiProviderProps {
  apiUrl: string;
}

function TrpcApiProvider(props: React.PropsWithChildren<TrpcApiProviderProps>) {
  const queryClient = getQueryClient();
  const { getToken } = useAuth();
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpLink({
          url: props.apiUrl,
          transformer: superjson,
          headers: async () => {
            const token = await getToken();
            return {
              Authorization: `Bearer ${token}`,
              'x-marivo-request-id': uuidv7(),
            };
          },
        }),
      ],
    }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {props.children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

const API_URL = import.meta.env.VITE_MARIVO_TRPC_API_URL;
if (!API_URL) {
  throw new Error('Missing TRPC API url');
}

function App() {
  return (
    <StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <TrpcApiProvider apiUrl={API_URL}>
          <NotificationsContextProvider>
            <BrowserRouter>
              <Routes />
            </BrowserRouter>
          </NotificationsContextProvider>
        </TrpcApiProvider>
      </ClerkProvider>
    </StrictMode>
  );
}

export default App;
