> Status: stub — expand during Phase 11 (Call Logs & Tagging) build

# Call Logs & Lead Tagging

## Call Logs (historical)
- Complete searchable history of every call ever logged
- Sortable and filterable by: outcome, lead source, closer, date range
- Quick presets: This Month, Last Month, Last 7 Days, Year-to-Date
- Inline edit and delete of individual entries
- Paginated

## Lead tags
Every call can be tagged. Tag values:

| Tag | Meaning |
|---|---|
| `closed` | Deal won |
| `follow-up` | Standard follow-up needed |
| `hot-follow-up` | High-priority follow-up |
| `no-show` | Prospect didn't attend |
| `declined` | Offer declined, no future action |

Inline editing — change a tag directly from the table without opening a modal.

## Lead reassignment
Admins can reassign a lead (and its associated call history) from one closer to another. This updates the `closer_id` on the call_log row.

## Setter attribution
Each call can be attributed to one or more setters via the `call_log_setters` junction table. The `booked_by_setter_id` column on `call_logs` stores the primary setter. Multiple setters per call are supported via junction table.

## TODO
- Search/filter API endpoints
- Pagination implementation
- Inline edit flow
- Lead reassignment endpoint (Admin only)
