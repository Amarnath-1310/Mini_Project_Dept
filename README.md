# MedSentry-XAI Clinical Network Intrusion Detection System

MedSentry-XAI is a three-service healthcare network security application. It accepts network traffic datasets, runs machine-learning intrusion detection with explainable AI, stores results in MySQL, and provides live traffic capture with real-time threat telemetry.

The application is designed for authorized hospital security personnel and local development. It is not a replacement for a production SIEM, IDS sensor, firewall, or clinical safety process.

## Features

- JWT authentication with BCrypt password hashing.
- Per-user dataset ownership and dashboard data isolation.
- MySQL persistence for users, datasets, predictions, detections, alerts, and traffic records.
- Dataset analysis for CSV, TSV, TXT, Parquet, Excel, and Feather files.
- XGBoost-based prediction with SHAP feature explanations.
- Dataset progress reporting and downloadable PDF, CSV, Excel, and JSON reports.
- Live network interface discovery.
- Start and stop live traffic capture from the dashboard.
- Real-time flow table with source, destination, protocol, prediction, confidence, and severity.
- Alert management and user profile management.
- Empty dashboard state for a new account with no uploaded datasets.

## Architecture

```text
React + Vite frontend :5173
						|
						v
Spring Boot API :8080  ---- MySQL :3306
						|
						v
FastAPI ML service :8000
						|
						+-- XGBoost model and SHAP explanations
						+-- Scapy live packet capture
						+-- Clinical traffic simulation fallback
```

### Project structure

```text
Mini_Project/
├── backend/                    Spring Boot REST API and MySQL persistence
│   ├── pom.xml
│   └── src/main/java/com/clinicalnids/backend/
├── clinical-nids-dashboard/    React/Vite frontend
│   ├── package.json
│   └── src/
├── ml-service/                 FastAPI prediction and live traffic service
│   ├── app.py
│   ├── predict.py
│   ├── prediction_engine.py
│   └── app/
└── start_all.bat               Windows launcher for all services
```

## Requirements

- Windows 10 or Windows 11.
- Java 17 or newer. The Maven project targets Java 17.
- MySQL Server 8 or newer. MySQL 9.7 is supported by the current setup.
- Python 3.10 or newer.
- Node.js 18 or newer and npm.
- Administrator privileges may be required for live packet capture.
- A local MySQL account with permission to create the `clinical_nids` database.

## MySQL setup

The default development configuration uses:

```text
Host:     localhost
Port:     3306
Database: clinical_nids
User:     root
Password: 1234
```

The JDBC URL includes `createDatabaseIfNotExist=true`, so the database is created automatically when the credentials are valid. To create it manually, run the following in MySQL Workbench or the MySQL client:

```sql
CREATE DATABASE IF NOT EXISTS clinical_nids
	CHARACTER SET utf8mb4
	COLLATE utf8mb4_unicode_ci;
```

Check the MySQL Windows service and port:

```powershell
Get-Service -Name '*mysql*'
Test-NetConnection localhost -Port 3306
```

The application uses `spring.jpa.hibernate.ddl-auto=update`. Hibernate creates and updates application tables on startup. Do not use this setting for production schema governance; use versioned migrations such as Flyway or Liquibase for production deployments.

## Configuration

Backend defaults are in [application.properties](Mini_Project/backend/src/main/resources/application.properties).

Supported environment variables:

| Variable               | Default                                         | Purpose                          |
| ---------------------- | ----------------------------------------------- | -------------------------------- |
| `DATABASE_URL`         | `jdbc:mysql://localhost:3306/clinical_nids?...` | MySQL JDBC URL                   |
| `DATABASE_USERNAME`    | `root`                                          | MySQL username                   |
| `DATABASE_PASSWORD`    | `1234`                                          | MySQL password                   |
| `JWT_SECRET`           | Development fallback                            | JWT signing secret               |
| `JWT_EXPIRATION_MS`    | `86400000`                                      | JWT lifetime in milliseconds     |
| `ML_SERVICE_URL`       | `http://localhost:8000`                         | FastAPI service URL              |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173`                         | Allowed frontend origins         |
| `UPLOAD_DIR`           | `./uploads`                                     | Backend dataset upload directory |

For production, always provide a long random `JWT_SECRET` through the environment or a secret manager. Never commit real passwords, tokens, or production credentials.

## First-time installation

Open PowerShell in the repository root:

```powershell
Set-Location D:\Mini_Project_Dept\Mini_Project
```

### Install Python dependencies

Using a virtual environment is recommended:

```powershell
Set-Location .\ml-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If PowerShell blocks activation for the current user, run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### Install frontend dependencies

```powershell
Set-Location ..\clinical-nids-dashboard
npm install
```

### Verify Java and Maven

```powershell
Set-Location ..\backend
java -version
.\mvnw.cmd -v
```

The repository includes a Maven wrapper, so a separate Maven installation is optional.

## Run the application

### Recommended Windows launcher

From `D:\Mini_Project_Dept\Mini_Project`:

```powershell
.\start_all.bat
```

This opens separate command windows for:

| Service             | URL                   | Port |
| ------------------- | --------------------- | ---: |
| React frontend      | http://localhost:5173 | 5173 |
| Spring Boot backend | http://localhost:8080 | 8080 |
| FastAPI ML service  | http://localhost:8000 | 8000 |

The launcher supplies a development JWT secret to the backend. Keep the service windows open while using the application.

### Run each service manually

Use separate PowerShell windows.

#### ML service

```powershell
Set-Location D:\Mini_Project_Dept\Mini_Project\ml-service
.\.venv\Scripts\Activate.ps1
python app.py
```

Alternative:

```powershell
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### Backend

```powershell
Set-Location D:\Mini_Project_Dept\Mini_Project\backend
$env:JWT_SECRET = 'replace-with-a-long-local-development-secret'
.\mvnw.cmd spring-boot:run
```

#### Frontend

```powershell
Set-Location D:\Mini_Project_Dept\Mini_Project\clinical-nids-dashboard
npm run dev
```

## Verify services

Run these checks after startup:

```powershell
Invoke-WebRequest http://localhost:8000/api/health -UseBasicParsing
Invoke-WebRequest http://localhost:8080/api/health -UseBasicParsing
Invoke-WebRequest http://localhost:5173 -UseBasicParsing
```

Expected results:

- ML service returns `status: healthy` and `model_loaded: true`.
- Backend returns `{"backend":"UP","mlService":"UP","status":"UP"}`.
- Frontend returns HTTP `200` and the Vite HTML page.

Useful ML diagnostics:

```powershell
Invoke-WebRequest http://localhost:8000/api/model/info -UseBasicParsing
Invoke-WebRequest http://localhost:8000/api/live-traffic/interfaces -UseBasicParsing
Invoke-WebRequest http://localhost:8000/api/live-traffic/status -UseBasicParsing
```

## Authentication

Open http://localhost:5173 and create an account or sign in.

Registration passwords must contain at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.

The backend returns a JWT after successful login or registration. Protected API requests use:

```http
Authorization: Bearer <token>
```

Protected routes return `401 Unauthorized` without a valid token. Administrative routes require the `ADMIN` role.

## Dataset analysis workflow

1. Sign in at http://localhost:5173/login.
2. Open **Dataset Upload**.
3. Select or drag a supported dataset file.
4. Select **Upload & Analyze Dataset**.
5. Wait for validation, preprocessing, prediction, SHAP, and report steps.
6. Review the analysis results and return to the dashboard.

Supported file extensions:

```text
.csv .tsv .txt .parquet .xlsx .xls .feather
```

The upload limit is 500 MB. CICIDS2017-style network flow data works best because the trained model expects its network flow feature set.

## Live traffic capture

Open **Live Traffic & Threats** after signing in.

1. Choose a network interface.
2. Select **Start Capture**.
3. Review packet count, analyzed flow count, threat count, and recent flow records.
4. Select **Stop Capture** when finished.

The capture service uses Scapy when available. Packet capture may require an elevated terminal or a packet-capture driver on Windows. The service also includes a controlled clinical traffic simulation so the end-to-end monitoring workflow can be tested when raw packet capture is not permitted.

Direct ML live-capture endpoints:

```text
GET  /api/live-traffic/interfaces
POST /api/live-traffic/start
GET  /api/live-traffic/status
GET  /api/live-traffic/flows?limit=50&since_id=0
POST /api/live-traffic/stop
```

The browser normally calls the equivalent authenticated Spring Boot routes:

```text
GET  /api/traffic/live/interfaces
POST /api/traffic/live/start
GET  /api/traffic/live/status
GET  /api/traffic/live/flows
POST /api/traffic/live/stop
```

## API overview

### Authentication

```text
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
PUT  /api/auth/profile
```

### Datasets and reports

```text
POST   /api/dataset/upload
POST   /api/dataset/{id}/analyze
GET    /api/dataset/{id}/progress
GET    /api/dataset/{id}/analysis
GET    /api/dataset/{id}/report
GET    /api/dataset/{id}/report/csv
GET    /api/dataset/{id}/report/excel
GET    /api/dataset/{id}/report/json
GET    /api/datasets
DELETE /api/dataset/{id}
```

### Dashboard and alerts

```text
GET /api/dashboard/latest/summary
GET /api/dashboard/{datasetId}/summary
GET /api/dashboard/datasets
GET /api/alerts
GET /api/alerts/{id}
PUT /api/alerts/{id}/review
PUT /api/alerts/{id}/notes
```

### Health

```text
GET /api/health
```

Interactive ML API documentation is available at http://localhost:8000/docs while the ML service is running.

## Build commands

Backend production package:

```powershell
Set-Location D:\Mini_Project_Dept\Mini_Project\backend
.\mvnw.cmd -DskipTests package
```

Frontend production build:

```powershell
Set-Location D:\Mini_Project_Dept\Mini_Project\clinical-nids-dashboard
npm run build
```

Frontend production preview:

```powershell
npm run preview
```

Python syntax check:

```powershell
Set-Location D:\Mini_Project_Dept\Mini_Project\ml-service
python -m compileall app.py app
```

## Troubleshooting

### Backend does not start because `JWT_SECRET` is missing

```powershell
$env:JWT_SECRET = 'replace-with-a-long-local-development-secret'
.\mvnw.cmd spring-boot:run
```

### MySQL connection refused

```powershell
Get-Service -Name '*mysql*'
Test-NetConnection localhost -Port 3306
```

Confirm that MySQL is running and that `root / 1234` is valid, or override `DATABASE_USERNAME`, `DATABASE_PASSWORD`, and `DATABASE_URL`.

### `Data truncation: Data too long for column 'predictions'`

The prediction JSON columns must be `LONGTEXT`. The current entity mapping applies this automatically on backend startup. Confirm the schema with:

```sql
SELECT COLUMN_NAME, DATA_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'clinical_nids'
	AND TABLE_NAME = 'prediction_results';
```

### Live capture has no packets

- Confirm the ML service is running.
- Select an active interface such as Wi-Fi.
- Run the capture service with the required Windows permissions.
- Use the configured simulation fallback to validate the UI and flow pipeline.

### Frontend shows a blank page

Check the Vite terminal for a compile/runtime error, then rebuild:

```powershell
Set-Location D:\Mini_Project_Dept\Mini_Project\clinical-nids-dashboard
npm run build
```

Clear the browser cache or reload the Vite page after fixing a runtime error.

## Security notes

- Change the default MySQL password and JWT secret outside local development.
- Do not expose the development services directly to the public internet.
- Restrict CORS to known frontend origins in deployed environments.
- Use HTTPS/TLS for all non-local traffic.
- Use a production migration tool instead of `ddl-auto=update`.
- Capture network traffic only with explicit authorization and according to hospital policy.
- Avoid storing raw sensitive clinical traffic unless retention and access controls are approved.

## Current local URLs

```text
Frontend:  http://localhost:5173
Backend:   http://localhost:8080
ML API:    http://localhost:8000
ML Docs:   http://localhost:8000/docs
```
