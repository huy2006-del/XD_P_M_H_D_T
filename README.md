# FreshVend

FreshVend has a Maven multi-module Spring Boot microservices backend,
React/Vite frontend, and PostgreSQL database.

The backend modules are Eureka discovery, Spring Cloud Gateway, identity,
inventory, and machine/cold-chain. Spring Boot, Spring Cloud, and JJWT versions
are managed by `backend/pom.xml`.

## Run the whole project (Windows PowerShell)

Install Java 17+, Maven, Node.js/npm, and start Docker Desktop. Open separate
PowerShell terminals at the repository root (`C:\XD_P_M_H_D_T`).

**Terminal 1 — PostgreSQL:**

```powershell
docker compose up -d postgres
```

**Terminals 2–6 — backend services (start discovery first):**

```powershell
Set-Location backend
mvn -pl discovery-server spring-boot:run
```

In four more terminals, run:

```powershell
Set-Location backend
mvn -pl identity-service spring-boot:run
```

```powershell
Set-Location backend
mvn -pl inventory-service spring-boot:run
```

```powershell
Set-Location backend
mvn -pl machine-coldchain-service spring-boot:run
```

```powershell
Set-Location backend
mvn -pl api-gateway spring-boot:run
```

The API Gateway listens on `http://localhost:8080`; Eureka is at
`http://localhost:8761`.

**Another terminal — frontend:**

Install dependencies once (or again only after `package.json` / lockfile
changes). Do not run `npm ci` while the Vite development server is running:
Windows may prevent npm from replacing its native Rolldown files.

```powershell
Set-Location frontend
npm ci
```

Then start the frontend:

```powershell
$env:VITE_USE_MOCK_AUTH = "true"
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`).
The backend does not yet implement authentication, so enable mock login for
frontend development. Sign in with `admin` / `admin123` or `operator` /
`operator123`.
Directly access the Kiosk routing: http://localhost:5173/kiosk-simulator

Stop each running server with `Ctrl+C`. Stop PostgreSQL from the repository root:

```powershell
docker compose down
```

`docker compose down -v` also deletes the database data volume.

If your terminal is currently inside `frontend`, run `Set-Location ..` (or
`cd ..`) to return to the repository root. To switch straight to the backend,
run `Set-Location ..\backend`.

The frontend requires `frontend/package.json`; install its packages from that
folder with `npm ci`. For a production frontend build, run `npm run build`.

## Database configuration

The services use separate PostgreSQL databases on `localhost:5433`:
`freshvend_identity`, `freshvend_inventory`, and `freshvend_machine`. A new
PostgreSQL volume creates them from `database/init/01-create-service-databases.sql`.
PostgreSQL only runs init scripts for an empty data volume. If you already have
the FreshVend volume, create any missing databases manually without deleting
the volume:

```powershell
docker exec freshvend_postgres psql -U freshvend_user -d postgres -c "CREATE DATABASE freshvend_identity;"
docker exec freshvend_postgres psql -U freshvend_user -d postgres -c "CREATE DATABASE freshvend_inventory;"
docker exec freshvend_postgres psql -U freshvend_user -d postgres -c "CREATE DATABASE freshvend_machine;"
```

Database URLs, usernames, passwords, ports, and the Eureka URL can be overridden
with `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `SERVER_PORT`, and
`EUREKA_SERVER_URL`. The previous monolithic database is not deleted or copied
automatically; it remains available for a deliberate data migration.

The `operators` table provides the minimal operator reference (`id`, `full_name`)
used by vending machines. Populate it from your employee-management module or
insert operator records before creating machines. For local testing, you can
create an operator directly in PostgreSQL:

```sql
INSERT INTO operators (full_name) VALUES ('Nguyễn Văn Vận Hành') RETURNING id;
```

## Vending machines and locations API

- `GET /api/v1/locations` and `POST /api/v1/locations`
- `GET /api/v1/machines?status=ONLINE&locationId=1`
- `GET /api/v1/machines/{id}`
- `POST /api/v1/machines` (returns `201 Created`; serial number must be unique)
- `PUT /api/v1/machines/{id}`
- `PATCH /api/v1/machines/{id}/status` with `{"status":"MAINTENANCE"}`
- `GET /api/v1/machines/{id}/slots`
- `POST /api/v1/machines/{id}/slots`
- `PUT /api/v1/slots/{slotId}` and `DELETE /api/v1/slots/{slotId}`
- `PATCH /api/v1/slots/{slotId}/status` with `{"status":"JAMMED"}`
- `GET /api/v1/machines/{id}/telemetry/latest`
- `GET /api/v1/machines/{id}/telemetry/history?limit=30`
- `POST /api/v1/simulator/machines/{id}/temp-spike?temp=13.5`
- `POST /api/v1/simulator/machines/{id}/toggle-power`

The virtual IoT simulator records readings every 10 seconds for ONLINE
machines, with temperature in the 3.5–6.5 °C range and humidity in the
80–90% range. Slot stock mirrors load/dispense operations made through the
existing slot batch inventory API.

Create a location with `name`, `address`, `city`, and optional `latitude` and
`longitude`. Machine create/update requests accept `serialNumber`, `name`,
optional `model`, `locationId`, and `operatorId`. New machines start as
`ONLINE`; machine responses include the location summary and operator name.

## Build and test

```powershell
Set-Location backend
mvn clean install
```

## Package layout

The Java base package remains `com.example.app`, now independently compiled in
each service module.

- `discovery-server` - Eureka service registry
- `api-gateway` - reactive entry point on port 8080
- `identity-service` - existing user management on port 8081
- `inventory-service` - product, batch, FIFO stock on port 8082
- `machine-coldchain-service` - locations, machines, slots, telemetry, simulator on port 8083
