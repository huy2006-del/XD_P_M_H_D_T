# FreshVend

FreshVend has a Spring Boot backend, React/Vite frontend, and PostgreSQL
database.

The backend includes Spring MVC, Bean Validation, Spring Data JPA, PostgreSQL,
Lombok, Spring Boot DevTools, and the Spring Boot testing stack. Dependency
versions are managed by the Spring Boot parent in `backend/pom.xml`.

## Run the whole project (Windows PowerShell)

Install Java 17+, Maven, Node.js/npm, and start Docker Desktop. Open three
PowerShell terminals at the repository root (`C:\XD_P_M_H_D_T`).

**Terminal 1 — PostgreSQL:**

```powershell
docker compose up -d postgres
```

**Terminal 2 — backend:**

```powershell
$env:DB_PASSWORD = "freshvend_secret_password"
Set-Location backend
mvn spring-boot:run
```

The API listens on `http://localhost:8080`.

**Terminal 3 — frontend:**

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

The backend connects to PostgreSQL at `localhost:5433` by default. You can
override the connection with `DB_URL` and `DB_USERNAME`; `SERVER_PORT` changes
the HTTP port.

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

Create a location with `name`, `address`, `city`, and optional `latitude` and
`longitude`. Machine create/update requests accept `serialNumber`, `name`,
optional `model`, `locationId`, and `operatorId`. New machines start as
`ONLINE`; machine responses include the location summary and operator name.

## Build and test

```powershell
cd backend
mvn test
mvn package
```

## Package layout

The Java source tree is `backend/src/main/java/com/example/app`. The base
package is `com.example.app`; rename it to your project-specific package before
adding application code.

- `config` - application configuration
- `controller` - HTTP endpoints
- `dto` - request and response objects
- `entity` - persistence entities
- `exception` - application exceptions and error handling
- `repository` - data access
- `service` - business logic
