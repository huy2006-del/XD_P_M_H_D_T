# Spring Boot Template

Reusable Java Spring Boot starter project using Maven and Java 17. The Spring
Boot project is under `backend/`.

The backend includes Spring MVC, Bean Validation, Spring Data JPA, PostgreSQL,
Lombok, Spring Boot DevTools, and the Spring Boot testing stack. Dependency
versions are managed by the Spring Boot parent in `backend/pom.xml`.

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
