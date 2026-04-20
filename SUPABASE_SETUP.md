# Shared Data Setup

This app can sync one shared state for both parents using Supabase.

## Create a table

Create a table named `progress_tracking_state` with:

- `id` `text` primary key
- `data` `jsonb` not null

Optional:

- `updated_at` `timestamptz` default `now()`

## Environment variables

Set these in Vercel and locally if you want the shared sync to work:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_TABLE` optional, defaults to `progress_tracking_state`

## How it behaves

- If the Supabase variables are present, the app loads and saves a single shared record.
- If they are missing, the app still works locally in the browser using `localStorage`.

