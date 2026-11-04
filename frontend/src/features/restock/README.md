# Restock feature

The wizard uses the existing machine, slot, batch, and slot-inventory APIs.
Its pending plan is local to the page and inventory is updated only when the
operator confirms.

`useRestockHistory` and `RestockSession` are retained as a starting point for a
future history screen. The current backend does not implement
`GET /api/v1/restock-sessions/machine/{machineId}`. Do not wire the history hook
into a page until that endpoint and its response contract are implemented.

The backend currently exposes `POST /api/v1/slots/{slotId}/batches` with
`{ "batchId": number, "quantity": number }` for each confirmed load. These
requests are not one atomic multi-item transaction; if a later request fails,
earlier successful loads remain applied and the UI retains only unprocessed
plan items for a retry.
