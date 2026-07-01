## Overview

This repository uses two distinct, informal logging approaches across its backend (Java/Spring Boot) and ML service (Python/FastAPI):

1. **Backend (Spring Boot)**: Uses **SLF4J** (`org.slf4j.Logger`) via `LoggerFactory.getLogger()` for structured, class-level logging. Log levels are configured in `application.properties`.
2. **ML Service (FastAPI/Python)**: Relies on bare `print()` statements for startup messages and simulator status. No `logging` module is imported or used anywhere in the Python codebase.

There is no centralized log aggregation, no structured JSON logging format, no log file rotation configuration, and no dedicated logging middleware or interceptor layer.

---

## Backend Logging (Java / Spring Boot)

### Framework & Initialization

- **Framework**: SLF4J API backed by Spring Boot's default Logback implementation (inherited from `spring-boot-starter-web`).
- **Pattern**: Each service class declares a `private static final Logger` field:
  ```java
  private static final Logger log = LoggerFactory.getLogger(DatasetService.class);
  ```
- **Classes using logging**:
  - `DatasetService.java` — logs dataset upload paths, ML service interactions, analysis failures, and JSON parsing warnings.
  - `DetectionService.java` — logs JSON processing errors and ML service call failures.
  - `ReportService.java` — logs PDF generation failures.

### Log Level Configuration

Defined in `backend/src/main/resources/application.properties`:
```properties
logging.level.com.clinicalnids=DEBUG
logging.level.org.springframework.security=INFO
```

- Application package (`com.clinicalnids`) is set to `DEBUG`, enabling verbose output during development.
- Spring Security framework logs at `INFO` level.
- No explicit log file path, pattern, or rotation is configured — output goes to the console/stdout via Spring Boot's default Logback configuration.

### Usage Patterns

- **Info-level**: Operational milestones (e.g., `log.info("Dataset saved: {}", filePath)`).
- **Error-level**: Exception handling with full stack traces (e.g., `log.error("Analysis failed for dataset {}", datasetId, e)`).
- **Warn-level**: Non-fatal parsing issues (e.g., `log.warn("Failed to parse stored distributions", e)`).
- Parameterized messages use `{}` placeholders (SLF4J style), avoiding string concatenation overhead.

---

## ML Service Logging (Python / FastAPI)

### Approach

- **No `logging` module usage**. A grep for `import logging`, `logging.`, `logger.`, or `LOG.` across all `.py` files returns zero matches.
- All diagnostic output uses bare `print()` calls:
  - `app.py`: Startup banner, simulator start/stop messages (`print(f"[Simulator] Started — {len(df)} rows queued")`).
  - `predict.py`: Model load confirmation (`print(f"Model loaded: {model_path.name}")`).

### Implications

- No log levels (DEBUG/INFO/WARN/ERROR) are distinguished.
- No structured fields, timestamps, or severity metadata are attached to output.
- Output cannot be filtered, routed, or aggregated independently of stdout.
- In production, these messages would be captured only if the process manager (e.g., systemd, Docker) redirects stdout to a log sink.

---

## Architecture & Conventions

| Aspect | Backend (Java) | ML Service (Python) |
|---|---|---|
| Framework | SLF4J + Logback (via Spring Boot) | None (bare `print()`) |
| Log levels | DEBUG, INFO, WARN, ERROR used | N/A |
| Structured fields | Parameterized `{}` placeholders | N/A |
| File output | Console only (default Logback) | Console only (stdout) |
| Rotation / retention | Not configured | Not applicable |
| Error context | Stack traces included via `log.error(msg, e)` | Exceptions propagate; no logging |

### Design Decisions (Inferred)

- The backend follows standard Spring Boot conventions for logging — minimal custom configuration, relying on framework defaults.
- The ML service treats logging as an afterthought; `print()` is used for quick debugging rather than production-grade observability.
- No cross-service correlation IDs or request tracing are implemented.
- No integration with external log sinks (ELK, Splunk, CloudWatch, etc.) is evident.

---

## Rules Developers Should Follow

### Backend (Java)

1. **Always use SLF4J**, never `System.out.println` or `e.printStackTrace()`.
2. **Declare logger per class**: `private static final Logger log = LoggerFactory.getLogger(ClassName.class);`
3. **Use parameterized messages**: `log.info("Processing dataset {}", id)` instead of string concatenation.
4. **Include exceptions in error logs**: `log.error("Operation failed", e)` to capture stack traces.
5. **Respect log levels**:
   - `DEBUG`: Detailed internal state (feature parsing, intermediate results).
   - `INFO`: Significant lifecycle events (upload complete, analysis started).
   - `WARN`: Recoverable anomalies (missing optional fields, fallback behavior).
   - `ERROR`: Failures requiring attention (ML service unreachable, database errors).
6. **Do not log sensitive data** (IP addresses, authentication tokens, raw traffic payloads) at INFO or DEBUG level without masking.

### ML Service (Python)

1. **Migrate from `print()` to `logging` module** for production readiness.
2. **Initialize a module-level logger**:
   ```python
   import logging
   logger = logging.getLogger(__name__)
   ```
3. **Replace `print()` calls** with appropriate level calls (`logger.info()`, `logger.error()`).
4. **Configure log format** to include timestamps and severity:
   ```python
   logging.basicConfig(
       level=logging.INFO,
       format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
   )
   ```
5. **Log exceptions with context**: `logger.exception("Prediction failed for flow %s", flow_id)`.

### Cross-Cutting

- No log aggregation pipeline exists. If deploying to production, configure both services to write to a shared log sink (file, syslog, or structured JSON stdout consumed by a log collector).
- Consider adding request/response logging middleware in Spring Boot (via `HandlerInterceptor` or `Filter`) and FastAPI (via middleware) for audit trails.