# Spring Boot Template

Reusable Java Spring Boot starter project using Maven and Java 17. The Spring
Boot project is under `backend/`.

The backend includes Spring MVC, Bean Validation, Spring Data JPA, PostgreSQL,
Lombok, Spring Boot DevTools, and the Spring Boot testing stack. Dependency
versions are managed by the Spring Boot parent in `backend/pom.xml`.

## Database configuration

The backend connects to PostgreSQL at `localhost:5433` by default. Configure
`DB_PASSWORD` in the shell before running it; `DB_URL` and `DB_USERNAME` can
also be overridden. For example, in PowerShell:

```powershell
$env:DB_PASSWORD = "<the PostgreSQL password configured for your environment>"
cd backend
mvn spring-boot:run
```

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

## Run

```bash
cd backend
mvn spring-boot:run
```

The application starts on port `8080` by default. Set `SERVER_PORT` to use a
different port.

## Build and test

```bash
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
