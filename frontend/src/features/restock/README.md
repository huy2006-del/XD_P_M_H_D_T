# Restock feature

The wizard keeps a browser draft for the signed-in operator and selected machine.
On confirmation it creates a restock session, submits each item, and completes
the session. The draft keeps the session ID and request IDs for retries.

Each accepted item updates inventory immediately. If an item fails, the wizard
keeps the remaining items and the session so the operator can resume. Reusing
the same request ID with the same payload returns the existing result.

History uses the Restock Session API and displays completed sessions.
Operators see their own sessions. Admins can view sessions across operators.
