

# External Data API for OpenClaw

## What This Does

Creates a secure backend endpoint that OpenClaw (or any external AI tool) can call to access all your agency data -- clients, leads, calls, funded investors, KPIs, and more. It uses a password (`HPA1234$`) for authentication so only authorized tools can access the data.

## How It Works

OpenClaw sends a request to a single API endpoint with:
1. The password for authentication
2. An action (e.g., "list all clients", "get leads for client X", "count funded investors")

The API responds with the requested data in JSON format.

## Supported Actions

| Action | Description |
|--------|-------------|
| `list_tables` | Lists all available database tables |
| `select` | Query any table with filters, sorting, pagination |
| `count` | Count records in any table |
| `insert` | Add new records |
| `update` | Modify existing records |
| `delete` | Remove records |

## Example Usage by OpenClaw

```text
POST /external-data-api
{
  "password": "HPA1234$",
  "action": "select",
  "table": "clients"
}

POST /external-data-api
{
  "password": "HPA1234$",
  "action": "select",
  "table": "leads",
  "filters": { "client_id": "some-uuid" },
  "limit": 100
}

POST /external-data-api
{
  "password": "HPA1234$",
  "action": "select",
  "table": "funded_investors",
  "order_by": "funded_at",
  "order_dir": "desc"
}
```

## Technical Details

### New File
- `supabase/functions/external-data-api/index.ts` -- A single edge function that:
  - Validates the password (`HPA1234$`) on every request
  - Uses the Supabase service role key to bypass RLS (full database access)
  - Supports full CRUD operations across all 50+ tables
  - Returns structured JSON responses with record counts
  - Handles errors gracefully with descriptive messages

### Tables Accessible
All 50+ tables including: `clients`, `leads`, `calls`, `funded_investors`, `daily_metrics`, `pipeline_opportunities`, `tasks`, `creatives`, `agency_members`, and everything else in the database.

### Security
- Password-protected (rejects requests without valid password)
- Service role key used server-side only (never exposed to browser)
- CORS enabled for cross-origin access from AI tools

