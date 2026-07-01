The Clinical Network Intrusion Detection System (NIDS) employs a decentralized, service-specific configuration strategy across its three main components: a Spring Boot backend, a FastAPI ML service, and a React frontend. There is no centralized configuration server or shared environment file (e.g., `.env`); instead, each service manages its own settings through native mechanisms.

### 1. Backend Configuration (Spring Boot)
The backend uses the standard Spring Boot `application.properties` file for all runtime configuration. Key aspects include:
- **Database Layer**: Configured to use an in-memory H2 database for development (`jdbc:h2:mem:clinicalnids`) with commented-out templates for switching to PostgreSQL in production. This indicates a manual, code-comment-based environment switching strategy rather than profile-based activation.
- **Security Secrets**: JWT signing secrets (`app.jwt.secret`) are hardcoded directly in `application.properties`. This is a significant security anti-pattern for production environments, as secrets should be injected via environment variables or a vault.
- **Inter-Service Communication**: The URL for the ML service is defined as a static property (`app.ml-service.url=http://localhost:8000`), coupling the backend to a specific local development topology.
- **CORS**: Allowed origins are explicitly listed in properties but also duplicated in the Java-based `SecurityConfig`, creating potential consistency risks if one is updated without the other.

### 2. ML Service Configuration (FastAPI)
The Python-based ML service relies on hardcoded constants and file-system conventions rather than external configuration files:
- **Port & Host**: The server port (8000) and host (0.0.0.0) are hardcoded in the `uvicorn.run()` call within `app.py`.
- **Path Management**: Directory paths for models (`model/`), data (`results/`), and uploads are derived relative to the script's location using `pathlib.Path`. This makes the service portable but inflexible regarding external storage locations.
- **CORS**: Cross-Origin Resource Sharing is configured to allow all origins (`allow_origins=["*"]`) directly in the middleware setup, prioritizing ease of development over security.

### 3. Frontend Configuration (React/Vite)
The React dashboard uses a minimal configuration approach:
- **Build Config**: `vite.config.js` contains only the essential React plugin, relying on Vite defaults for everything else.
- **API Endpoints**: Backend and ML service URLs are hardcoded as constants (`SPRING_BOOT_URL`, `ML_SERVICE_URL`) in `src/data/api.js`. This requires manual code changes to switch between development, staging, or production API endpoints, as there is no `.env` file or build-time variable injection strategy implemented.

### 4. Orchestration & Startup
System startup is managed by a Windows batch script (`start_all.bat`), which launches the ML service and Frontend in separate terminal windows and provides instructions for manually starting the Maven backend. This script embeds absolute file paths (e.g., `D:\Mini_Project_Dept\...`), making it non-portable and strictly tied to the original developer's machine structure.

### Developer Rules & Conventions
- **No Centralized Secrets**: Secrets like JWT keys are currently in plain text properties. Developers must manually extract these to environment variables before any production deployment.
- **Manual Environment Switching**: Switching databases (H2 vs. PostgreSQL) requires uncommenting/commenting lines in `application.properties`.
- **Hardcoded Topology**: Inter-service communication assumes all services run on `localhost` with specific ports (8080, 8000, 5173). Changing ports requires updates in `application.properties`, `api.js`, and `start_all.bat`.
- **Windows-Centric Ops**: The primary orchestration tool is a `.bat` file, implying a Windows-first development environment. Linux/Mac developers must manually replicate the startup sequence.