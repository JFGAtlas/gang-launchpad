import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Token from './pages/Token.jsx'
import Docs from './pages/Docs.jsx'

const qc = new QueryClient({ defaultOptions: { queries: { refetchInterval: 5000, staleTime: 2000, retry: 1 } } })
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/token/:address" element={<Token />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="*" element={<div className="wrap empty">Not found</div>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
