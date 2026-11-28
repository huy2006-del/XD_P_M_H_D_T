# FreshVend

FreshVend has a Maven multi-module Spring Boot microservices backend,
React/Vite frontend, PostgreSQL database, and RabbitMQ message broker.

The backend modules are Eureka discovery, Spring Cloud Gateway, identity,
inventory, and machine/cold-chain. Spring Boot, Spring Cloud, SpringDoc OpenAPI,
and JJWT versions are managed by `backend/pom.xml`.

## Run the whole project with Docker Compose (8 containers)

Install Java 17+, Maven, and start Docker Desktop. Open a PowerShell terminal
at the repository root (`C:\XD_P_M_H_D_T`).

**Step 1 — Build backend JAR packages:**

```powershell
Set-Location backend
.\mvnw.cmd clean package -DskipTests
Set-Location ..

```

To rebuild a single updated service without rebuilding everything, run
`.\mvnw.cmd clean package -pl <module-name> -DskipTests` and then
`docker compose restart <service-name>`.

**Step 2 — Start all 8 containers (`postgres`, `rabbitmq`, `discovery-server`, `api-gateway`, `identity-service`, `inventory-service`, `machine-coldchain-service`, `frontend`):**

```powershell
docker compose up -d

```

* Frontend Web App: `http://localhost:5173` (Kiosk Simulator: `http://localhost:5173/kiosk-simulator`)
* API Gateway: `http://localhost:8080`
* Eureka Service Registry: `http://localhost:8761`
* RabbitMQ Management UI: `http://localhost:15672` (`guest` / `guest`)
* Swagger UI (`identity-service`): `http://localhost:8081/swagger-ui/index.html`
* Swagger UI (`inventory-service`): `http://localhost:8082/swagger-ui/index.html`
* Swagger UI (`machine-coldchain-service`): `http://localhost:8083/swagger-ui/index.html`

When testing protected endpoints in Swagger UI, select `http://localhost:8080`
under **Servers**, log in at `POST /api/v1/auth/login` (`admin` / `admin123`),
copy `token`, and paste it into **Authorize**.

Stop all containers from the repository root:

```powershell
docker compose stop

```

`docker compose stop ` also stop the database data volume.

## Run the whole project (Windows PowerShell — Local Dev)

Install Java 17+, Maven, Node.js/npm, and start Docker Desktop. Open separate
PowerShell terminals at the repository root (`C:\XD_P_M_H_D_T`).

**Terminal 1 — PostgreSQL & RabbitMQ:**

```powershell
docker compose up -d postgres rabbitmq

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

Then start the frontend. By default it uses the real API through the gateway at
`http://localhost:8080`; make sure `identity-service` is running and registered
with Eureka before signing in. On first startup, it seeds `admin` / `admin123`
and `operator` / `operator123`.

```powershell
npm run dev

```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`).
For frontend-only development without the backend, set
`$env:VITE_USE_MOCK_AUTH = "true"` before starting Vite to use mock login.
Directly access the Kiosk routing: http://localhost:5173/kiosk-simulator

Stop each running server with `Ctrl+C`. Stop PostgreSQL and RabbitMQ from the repository root:

```powershell
docker compose stop

```

`docker compose stop ` also stop the database data volume.

If your terminal is currently inside `frontend`, run `Set-Location ..` (or
`cd ..`) to return to the repository root. To switch straight to the backend,
run `Set-Location ..\backend`.

The frontend requires `frontend/package.json`; install its packages from that
folder with `npm ci`. For a production frontend build, run `npm run build`.

## Database & messaging configuration

The services use separate PostgreSQL databases on `localhost:5433`:
`freshvend_identity`, `freshvend_inventory`, and `freshvend_machine_db`. A new
PostgreSQL volume creates them from `database/init/01-create-service-databases.sql`.
PostgreSQL only runs init scripts for an empty data volume. If you already have
the FreshVend volume, create any missing databases manually without deleting
the volume:

```powershell
docker exec freshvend_postgres psql -U freshvend_user -d postgres -c "CREATE DATABASE freshvend_identity;"
docker exec freshvend_postgres psql -U freshvend_user -d postgres -c "CREATE DATABASE freshvend_inventory;"
docker exec freshvend_postgres psql -U freshvend_user -d postgres -c "CREATE DATABASE freshvend_machine_db;"

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

RabbitMQ runs on `localhost:5672` (Management UI at `http://localhost:15672`,
default `guest` / `guest`). When an order payment webhook is confirmed in
`inventory-service`, a dispense event is published to `dispense.command.queue`
(backed by Dead-Letter Exchange `freshvend.dlx` and `dispense.failure.dlq`) and
consumed by `machine-coldchain-service`. Real-time telemetry updates stream over
WebSocket at `/ws-freshvend/**` via the API Gateway (`ws://localhost:8080/ws-freshvend`).

## Identity & inventory API

* `POST /api/v1/auth/login` (returns JWT `token` and user info)
* `GET /api/v1/users` and `POST /api/v1/users` (`ADMIN` only)
* `GET /api/v1/audit-logs` and `POST /api/v1/audit-logs`
* `GET /api/v1/products`, `POST /api/v1/products`, `PUT /api/v1/products/{id}`, `DELETE /api/v1/products/{id}`
* `GET /api/v1/batches`, `POST /api/v1/batches`, `POST /api/v1/restock-sessions`
* `POST /api/v1/orders`, `GET /api/v1/orders`, `POST /api/v1/payments/webhook`
* Analytics & CSV export endpoints under `/api/v1/analytics/**`

## Vending machines and locations API

* `GET /api/v1/locations` and `POST /api/v1/locations`
* `GET /api/v1/machines?status=ONLINE&locationId=1`
* `GET /api/v1/machines/{id}`
* `POST /api/v1/machines` (returns `201 Created`; serial number must be unique)
* `PUT /api/v1/machines/{id}`
* `PATCH /api/v1/machines/{id}/status` with `{"status":"MAINTENANCE"}`
* `GET /api/v1/machines/{id}/slots`
* `POST /api/v1/machines/{id}/slots`
* `PUT /api/v1/slots/{slotId}` and `DELETE /api/v1/slots/{slotId}`
* `PATCH /api/v1/slots/{slotId}/status` with `{"status":"JAMMED"}`
* `GET /api/v1/machines/{id}/telemetry/latest`
* `GET /api/v1/machines/{id}/telemetry/history?limit=30`
* `POST /api/v1/simulator/machines/{id}/temp-spike?temp=13.5`
* `POST /api/v1/simulator/machines/{id}/toggle-power`

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

* `discovery-server` - Eureka service registry
* `api-gateway` - reactive entry point on port 8080
* `identity-service` - existing user management on port 8081
* `inventory-service` - product, batch, FIFO stock on port 8082
* `machine-coldchain-service` - locations, machines, slots, telemetry, simulator on port 8083

```

```
