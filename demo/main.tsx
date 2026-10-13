/**
 * demo/main.tsx — entry point for the runnable demo.
 */
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Layout, Segmented } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { SchemaTable } from '../SchemaTable'
import { installMockApi } from './mockApi'

installMockApi()

const queryClient = new QueryClient()

function App () {
  const [tableKey, setTableKey] = useState('products')

  return (
    <Layout.Content style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
      <Segmented
        value={tableKey}
        onChange={value => setTableKey(String(value))}
        options={[
          { label: 'Products', value: 'products' },
          { label: 'Suppliers', value: 'suppliers' }
        ]}
        style={{ marginBottom: 16 }}
      />
      {/* `key` resets filter/sort/page state when switching tables. */}
      <SchemaTable key={tableKey} tableKey={tableKey} />
    </Layout.Content>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
