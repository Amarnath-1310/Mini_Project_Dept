The Clinical Network Intrusion Detection System (NIDS) employs a manual, script-assisted build and orchestration strategy for its three-tier architecture (Spring Boot Backend, React Frontend, Python ML Service). There is no containerization (Docker), CI/CD pipeline, or unified build tool (like Make or Gradle) across the entire project. Instead, each service relies on its ecosystem's standard package manager, coordinated by a Windows batch file.

### Build Systems by Component

1. **Backend (Java/Spring Boot)**:
   - **Tool**: Apache Maven (version 3.9.7 via wrapper).
   - **Configuration**: `Mini_Project/backend/pom.xml` defines dependencies and the `spring-boot-maven-plugin` for packaging.
   - **Execution**: Developers are expected to run `mvn spring-boot:run` manually or via the backend-specific wrapper if present (though the batch script assumes a global `mvn` command).

2. **Frontend (React/Vite)**:
   - **Tool**: npm and Vite.
   - **Configuration**: `Mini_Project/clinical-nids-dashboard/package.json` manages dependencies and scripts (`dev`, `build`, `preview`).
   - **Execution**: `npm run dev` starts the development server on port 5173.

3. **ML Service (Python/FastAPI)**:
   - **Tool**: pip and Python.
   - **Configuration**: `Mini_Project/ml-service/requirements.txt` lists dependencies like `fastapi`, `xgboost`, and `shap`.
   - **Execution**: `python app.py` starts the FastAPI server on port 8000.

### Orchestration

- **Primary Mechanism**: `Mini_Project/start_all.bat` is a Windows-specific batch script that launches the ML Service and Frontend in separate command windows using `start cmd /k`. 
- **Limitations**: The script explicitly notes that the Spring Boot backend must be started manually in a separate terminal because it requires Maven, which the batch file does not automate. This indicates a semi-automated local development environment rather than a production-ready deployment pipeline.
- **Platform Constraint**: The orchestration script is hardcoded for Windows (`@echo off`, `cd /d D:\...` paths), limiting cross-platform reproducibility without manual adaptation.

### Deployment & Artifacts

- **No Containerization**: Absence of `Dockerfile` or `docker-compose.yml` suggests services are deployed directly to hosts or VMs.
- **No CI/CD**: No `.github/workflows` or similar CI configuration was found, implying manual testing and deployment.
- **Versioning**: All components are pinned to version `1.0.0` in their respective manifests (`pom.xml`, `package.json`), but there is no automated release flow.