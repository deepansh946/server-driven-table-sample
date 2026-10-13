# Server-driven tables

A React + TypeScript pattern where **the backend describes a list page and the frontend renders it**. A new list, or a new column or filter on an existing one, ships with a backend deploy and no frontend release.

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
