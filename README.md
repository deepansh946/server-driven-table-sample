# Server-driven tables

A React + TypeScript pattern where **the backend describes a list page and the frontend renders it**. A new list, or a new column or filter on an existing one, ships with a backend deploy and no frontend release.

**▶ [Open the live demo](https://stackblitz.com/github/deepansh946/server-driven-table-sample)** (runs in your browser, no install needed)

Or run it locally:

```bash
npm install
npm run dev
```

The demo has two tables, Products and Suppliers, rendered by the same `<SchemaTable>` component from two different schemas. A small fake backend running in the browser (`demo/mockApi.ts`) serves the schemas and actually applies filters, sorting and paging, so every control works.

## Quick start

**1. The server sends a schema** (`GET /api/tables/products/schema`):

```json
{
  "key": "products",
  "title": "Product catalog",
  "columns": {
    "name":    { "label": "Name",  "type": "text",     "sortable": true, "filter": { "kind": "text" } },
    "price":   { "label": "Price", "type": "currency", "props": { "currency": "USD" },
                 "filter": { "kind": "range", "min": 0, "max": 10000 } },
    "inStock": { "label": "Stock", "type": "badge",
                 "props": { "colors": { "true": "green", "false": "red" },
                            "labels": { "true": "In stock", "false": "Sold out" } } }
  }
}
```

**2. Rows come from a separate endpoint** (`GET /api/tables/products?page=1&pageSize=10`):

```json
{
  "total": 2,
  "rows": [
    { "id": 1, "name": "Mechanical keyboard", "price": 129, "inStock": true },
    { "id": 2, "name": "4K monitor",          "price": 449, "inStock": false }
  ]
}
```

**3. The frontend needs one line per page:**

```tsx
<QueryClientProvider client={queryClient}>
  <SchemaTable tableKey='products' />
</QueryClientProvider>
```

**Result:**

```
Product catalog
┌─────────────────────────┬────────────┬──────────────┐
│ Name ↕ 🔍               │ Price  ⏷   │ Stock        │
├─────────────────────────┼────────────┼──────────────┤
│ Mechanical keyboard     │ $129.00    │ [In stock]   │  ← green tag
│ 4K monitor              │ $449.00    │ [Sold out]   │  ← red tag
└─────────────────────────┴────────────┴──────────────┘
```

- **Name:** sortable, with a text search box (🔍).
- **Price:** formatted as currency, with a min/max range filter (⏷).
- **Stock:** a coloured badge.

To add a "Supplier" column with a dropdown filter, the backend adds one more entry to `columns`. The frontend code doesn't change. See `productsSchema` in `schema.ts` for a fuller example, including a filter whose options come from another endpoint.

## The pattern

1. **The schema is the contract** (`schema.ts`). For each table the server returns a JSON schema: columns, a cell `type` for each column, and an optional filter spec.
2. **Remote filters are resolved once** (`api.ts`). A filter can point to another endpoint for its choices (e.g. all suppliers). Those endpoints are fetched in parallel, and the result is a new schema with only plain options in it. This is checked by the type system: `ResolvedTableSchema` can't contain a `remoteOptions` filter.
3. **A registry maps types to components** (`cellRegistry.tsx`). The server says `"type": "currency"` and the client decides what a currency cell looks like. Unknown types fall back to a plain cell, so an older client still renders tables from a newer backend.
4. **Column building is a pure function** (`buildColumns.tsx`). It takes the schema and filter state and returns antd columns. An exhaustive `switch` over filter kinds means a new kind can't be added without handling it.
5. **One component renders any table** (`SchemaTable.tsx`). It holds the filter, sort and page state, serializes it to query params, and leaves the actual querying to the server.

```
GET /tables/:key/schema ──► resolveRemoteFilters ──► buildColumns ──► <Table>
                               │ (parallel)              │
                               ▼                         ▼
                        GET /suppliers, ...        cellRegistry[type]
```

## Project layout

```
schema.ts          the server/client contract, plus an example schema
api.ts             fetching, and resolving filter options from other endpoints
cellRegistry.tsx   cell type → React component
buildColumns.tsx   schema → antd columns and filters (pure function)
SchemaTable.tsx    the generic table component
demo/              runnable demo only: fake API, sample data, entry point
```

## Trade-offs

| Pros | Cons |
| --- | --- |
| New lists and columns need no frontend deploy | Typing is weaker at the boundary: row values are `unknown` until a cell narrows them |
| Every list looks and behaves the same | Truly custom UI needs a way around the generic table (register a new cell type) |
| Server and client share one source of truth for filters | Server and client must agree on the query-param format |

## Hardening choices

- **Link cells** only allow relative or `http(s)` URLs, so a bad schema can't produce a `javascript:` URL.
- **The registry lookup** checks own properties only, so a type like `"constructor"` can't reach `Object.prototype`.
- **A failing options endpoint** degrades that one column to a text filter. The rest of the table keeps working.
- **The schema is never mutated**, which matters because it lives in the react-query cache.

## Extending

- **New cell type:** add it to `CellType`, then add one component to `cellRegistry`. The compiler enforces both steps.
- **New filter kind:** add it to `FilterSpec`, then handle it in `filterProps`. The `never` check enforces this.
