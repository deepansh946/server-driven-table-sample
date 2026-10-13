/**
 * demo/mockApi.ts — a fake backend that runs in the browser.
 *
 * It intercepts `fetch` calls to /api/* so the demo needs no server. It reads
 * the same schemas the client renders, and applies filters, sorting and
 * paging the way a real backend would, so every control in the table works.
 */
import { productsSchema } from '../schema'
import type { Row, TableSchema } from '../schema'
import { products, suppliers, suppliersSchema } from './data'

const tables: Record<string, { schema: TableSchema; rows: Row[] }> = {
  products: { schema: productsSchema, rows: products },
  suppliers: { schema: suppliersSchema, rows: suppliers }
}

const LATENCY_MS = 300

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function matchesFilters (row: Row, schema: TableSchema, params: URLSearchParams) {
  return Object.entries(schema.columns).every(([field, column]) => {
    const values = params.getAll(`filter[${field}]`)
    if (!column.filter || values.length === 0) return true
    const cell = row[field]

    switch (column.filter.kind) {
      case 'text':
        return String(cell ?? '').toLowerCase().includes(values[0].toLowerCase())
      case 'options':
      case 'remoteOptions':
        return values.includes(String(cell))
      case 'range': {
        const [min, max] = values.map(Number)
        return typeof cell === 'number' && cell >= min && cell <= max
      }
    }
  })
}

function compare (a: unknown, b: unknown) {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a ?? '').localeCompare(String(b ?? ''))
}

function queryTable (key: string, params: URLSearchParams) {
  const table = tables[key]
  if (!table) return json({ error: `Unknown table "${key}"` }, 404)

  let rows = table.rows.filter(row => matchesFilters(row, table.schema, params))

  const [sortField, sortOrder] = (params.get('sort') ?? '').split(':')
  if (sortField && table.schema.columns[sortField]?.sortable) {
    const direction = sortOrder === 'desc' ? -1 : 1
    rows = [...rows].sort((a, b) => direction * compare(a[sortField], b[sortField]))
  }

  const page = Math.max(1, Number(params.get('page')) || 1)
  const pageSize = Math.max(1, Number(params.get('pageSize')) || 25)
  return json({ total: rows.length, rows: rows.slice((page - 1) * pageSize, page * pageSize) })
}

function route (url: URL): Response {
  const path = url.pathname.replace(/^\/api/, '')

  if (path === '/suppliers') return json(suppliers.map(({ id, name }) => ({ id, name })))
  if (path === '/countries') return json([...new Set(suppliers.map(s => s.country))].sort())

  const schemaMatch = path.match(/^\/tables\/([\w-]+)\/schema$/)
  if (schemaMatch) {
    const table = tables[schemaMatch[1]]
    return table ? json(table.schema) : json({ error: 'Not found' }, 404)
  }

  const rowsMatch = path.match(/^\/tables\/([\w-]+)$/)
  if (rowsMatch) return queryTable(rowsMatch[1], url.searchParams)

  return json({ error: 'Not found' }, 404)
}

export function installMockApi () {
  const realFetch = window.fetch.bind(window)

  window.fetch = async (input, init) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(href, window.location.origin)
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) {
      return realFetch(input, init)
    }
    await new Promise(resolve => setTimeout(resolve, LATENCY_MS))
    return route(url)
  }
}
