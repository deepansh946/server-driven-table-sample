/**
 * api.ts — fetching schemas and rows, and resolving remote filter options.
 */
import type {
  FilterOption,
  FilterSpec,
  ResolvedColumnSpec,
  ResolvedFilterSpec,
  ResolvedTableSchema,
  Row,
  TableSchema
} from './schema'

const BASE_URL = '/api'

async function getJson<T> (path: string, params?: URLSearchParams): Promise<T> {
  const query = params?.toString()
  const res = await fetch(`${BASE_URL}${path}${query ? `?${query}` : ''}`)
  if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`)
  return (await res.json()) as T
}

export type Page<T> = { rows: T[]; total: number }

export const fetchSchema = (key: string) =>
  getJson<TableSchema>(`/tables/${encodeURIComponent(key)}/schema`)

export const fetchRows = (key: string, params: URLSearchParams) =>
  getJson<Page<Row>>(`/tables/${encodeURIComponent(key)}`, params)

/** Option endpoints may return plain values (['A', 'B']) or objects ([{ id, name }]). */
function toOption (record: unknown, labelField = 'label', valueField = 'value'): FilterOption {
  if (typeof record === 'string' || typeof record === 'number') {
    return { label: String(record), value: record }
  }
  const obj = (record ?? {}) as Record<string, unknown>
  const value = obj[valueField] ?? obj[labelField] ?? ''
  const label = obj[labelField] ?? value
  return { label: String(label), value: typeof value === 'number' ? value : String(value) }
}

async function resolveFilter (filter: FilterSpec): Promise<ResolvedFilterSpec> {
  if (filter.kind !== 'remoteOptions') return filter
  try {
    const records = await getJson<unknown[]>(filter.endpoint)
    return {
      kind: 'options',
      multiple: filter.multiple,
      options: records.map(record => toOption(record, filter.labelField, filter.valueField))
    }
  } catch (error) {
    // One broken options endpoint shouldn't take the whole table down.
    // Fall back to free-text search on that column instead.
    console.warn(`Could not load filter options from ${filter.endpoint}`, error)
    return { kind: 'text' }
  }
}

/**
 * Replace every `remoteOptions` filter with a plain `options` filter.
 * Fetches all option endpoints in parallel and returns a NEW schema; the
 * input object is never mutated (it may be sitting in a query cache).
 */
export async function resolveRemoteFilters (schema: TableSchema): Promise<ResolvedTableSchema> {
  const columns = await Promise.all(
    Object.entries(schema.columns).map(
      async ([key, { filter, ...column }]): Promise<[string, ResolvedColumnSpec]> => [
        key,
        filter ? { ...column, filter: await resolveFilter(filter) } : column
      ]
    )
  )
  return { ...schema, columns: Object.fromEntries(columns) }
}
