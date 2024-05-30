import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, Outlet, redirect, RouterProvider } from 'react-router-dom'
import ExpPage, { action as expAction } from './routes/exp'
import { ConnectProvider, DisconnectProvider, WalletProvider, WalletsProvider } from '@wallet-standard/react-core'
import { MantineProvider } from '@mantine/core'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queries/queryClient'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import EligiblePage, { action as eligibleAction } from './routes/eligible'

import '@mantine/core/styles.css';

const router = createBrowserRouter([
  {
    path: "/",
    element: <Outlet />,
    children: [
      {
        index: true,
        loader: () => redirect('/exp')
      },
      {
        path: "exp",
        element: <ExpPage />,
        action: expAction,
      },
      {
        path: "eligible",
        element: <EligiblePage />,
        action: eligibleAction,
      }
    ]
  },
])


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WalletsProvider>
      <WalletProvider>
        <ConnectProvider>
          <DisconnectProvider>
            <MantineProvider defaultColorScheme='dark'>
              <QueryClientProvider client={queryClient}>
                <ReactQueryDevtools initialIsOpen={false} />
                <RouterProvider router={router} />
              </QueryClientProvider>
            </MantineProvider>
          </DisconnectProvider>
        </ConnectProvider>
      </WalletProvider>
    </WalletsProvider>
  </React.StrictMode>,
)
