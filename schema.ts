/**
 * schema.ts — the contract between server and client.
 *
 * The server decides WHAT a table shows: which columns exist, which cell
 * renderer each one uses, and which filters it offers. The client decides
 * HOW each of those renderers and filters looks. Shipping a new list (or a
 * new column on an existing one) is a backend-only change.
 */

/** Every cell renderer the client knows about. See cellRegistry.tsx. */
export type CellType = 'text' | 'number' | 'currency' | 'tags' | 'badge' | 'link'

export type FilterOption = { label: string; value: string | number }

export type FilterSpec =
  /** Free-text search. */
  | { kind: 'text' }
  /** Fixed list of choices, inlined in the schema. */
  | { kind: 'options'; options: FilterOption[]; multiple?: boolean }
  /**
   * Choices that live behind another endpoint (e.g. all suppliers). The client
   * fetches them once and turns this into an `options` filter. See api.ts.
   * `labelField` / `valueField` pick fields when the endpoint returns objects.
   */
  | {
      kind: 'remoteOptions'
      endpoint: string
      labelField?: string
      valueField?: string
      multiple?: boolean
    }
  /** Numeric min/max. */
  | { kind: 'range'; min: number; max: number }

export type ColumnSpec = {
  label: string
  type: CellType
  width?: number
  sortable?: boolean
  filter?: FilterSpec
  /** Extra settings handed to the cell renderer (currency code, link template...). */
  props?: Record<string, unknown>
}

export type TableSchema = {
  key: string
  title: string
  description?: string
  /** Object insertion order = column order. */
  columns: Record<string, ColumnSpec>
}

/**
 * The schema after remote filters are resolved. Encoding "no remoteOptions
 * left" in the type means buildColumns can never be handed an unresolved one.
 */
export type ResolvedFilterSpec = Exclude<FilterSpec, { kind: 'remoteOptions' }>
export type ResolvedColumnSpec = Omit<ColumnSpec, 'filter'> & { filter?: ResolvedFilterSpec }
export type ResolvedTableSchema = Omit<TableSchema, 'columns'> & {
  columns: Record<string, ResolvedColumnSpec>
}

export type Row = { id: string | number } & Record<string, unknown>

/** Example of what `GET /api/tables/products/schema` returns. */
export const productsSchema: TableSchema = {
  key: 'products',
  title: 'Product catalog',
  description: 'Everything we sell, with live stock status.',
  columns: {
    name: { label: 'Name', type: 'text', width: 240, sortable: true, filter: { kind: 'text' } },
    category: {
      label: 'Category',
      type: 'text',
      filter: {
        kind: 'options',
        multiple: true,
        options: [
          { label: 'Hardware', value: 'hardware' },
          { label: 'Software', value: 'software' },
          { label: 'Services', value: 'services' }
        ]
      }
    },
    price: {
      label: 'Price',
      type: 'currency',
      sortable: true,
      props: { currency: 'USD' },
      filter: { kind: 'range', min: 0, max: 10_000 }
    },
    tags: { label: 'Tags', type: 'tags' },
    inStock: {
      label: 'Stock',
      type: 'badge',
      props: {
        colors: { true: 'green', false: 'red' },
        labels: { true: 'In stock', false: 'Sold out' }
      },
      filter: {
        kind: 'options',
        options: [
          { label: 'In stock', value: 'true' },
          { label: 'Sold out', value: 'false' }
        ]
      }
    },
    supplierName: {
      label: 'Supplier',
      type: 'link',
      props: { href: '/suppliers/{supplierId}' },
      filter: {
        kind: 'remoteOptions',
        endpoint: '/suppliers',
        labelField: 'name',
        valueField: 'id',
        multiple: true
      }
    }
  }
}
