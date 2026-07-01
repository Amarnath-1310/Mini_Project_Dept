## Overview

This repository employs a **multi-ecosystem dependency management strategy** across three distinct service layers, each using its native package manager:

1. **Java Backend** — Apache Maven (Spring Boot parent POM)
2. **React Dashboard** — npm with Vite build tooling
3. **ML Service** — pip via `requirements.txt`

No centralized monorepo dependency orchestration tool (e.g., Nx, Lerna, or Bazel) is used. Each component manages dependencies independently.

---

## Backend (Java/Spring Boot)

### Package Manager: Maven

- **Build file**: `Mini_Project/backend/pom.xml`
- **Parent POM**: Inherits from `org.springframework.boot:spring-boot-starter-parent:3.3.1`, which provides managed dependency versions for all Spring Boot starters and common libraries.
- **Maven Wrapper**: Configured in `.mvn/wrapper/maven-wrapper.properties` to use Maven 3.9.7, ensuring consistent build tooling across environments without requiring a system-wide Maven installation.

### Key Dependencies

| Category | Dependencies |
|---|---|
| **Spring Boot Starters** | `spring-boot-starter-web`, `spring-boot-starter-webflux`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-validation` |
| **Database** | PostgreSQL (runtime), H2 (runtime, dev/test) |
| **Security** | JJWT (`io.jsonwebtoken:jjwt-api/impl/jackson`) v0.12.5 |
| **Utilities** | Lombok (optional, excluded from final JAR) |
| **Reporting** | OpenPDF v1.3.30 |
| **Testing** | `spring-boot-starter-test`, `spring-security-test` |

### Versioning Strategy

- Spring Boot parent POM manages versions for all `spring-boot-starter-*` dependencies, eliminating the need for explicit version declarations.
- Custom versions are declared only for non-Spring libraries: JJWT (via `<properties>` block) and OpenPDF (hardcoded).
- No `<dependencyManagement>` section or custom `<repositories>` configured — relies entirely on Maven Central.

### Lockfile

- **No `pom.xml.lock` or equivalent**. Maven does not produce lockfiles by default. Reproducibility depends on the parent POM's managed versions and explicit version pins.

---

## Frontend (React/Vite)

### Package Manager: npm

- **Manifest**: `Mini_Project/clinical-nids-dashboard/package.json`
- **Lockfile**: `package-lock.json` (lockfileVersion 3, npm v7+ format)
- **Build Tool**: Vite v5.2.12 with `@vitejs/plugin-react`

### Key Dependencies

| Category | Dependencies |
|---|---|
| **Core** | React 18.3.x, React DOM 18.3.x |
| **Routing** | react-router-dom 6.23.x |
| **Visualization** | recharts 2.12.x |
| **Icons** | lucide-react 0.378.x |
| **Styling** | Tailwind CSS 3.4.x, PostCSS 8.4.x, Autoprefixer 10.4.x |
| **Dev Tooling** | Vite 5.2.x, @vitejs/plugin-react 4.3.x |

### Versioning Strategy

- All dependencies use **caret (`^`) version ranges**, allowing minor and patch updates during `npm install` while preventing major version bumps.
- The `package-lock.json` file pins exact resolved versions with integrity hashes (SHA-512), ensuring deterministic installs across environments.
- Dependencies are fetched from the public npm registry (`https://registry.npmjs.org`).
- No private registries, scopes, or `.npmrc` configuration detected.

### Notable Configuration

- `"allowScripts": { "esbuild@0.21.5": true }` — explicitly permits postinstall scripts for esbuild, likely to suppress npm warnings about script execution.

---

## ML Service (Python)

### Package Manager: pip

- **Manifest**: `Mini_Project/ml-service/requirements.txt`
- **No lockfile** — no `requirements.lock`, `Pipfile.lock`, or `poetry.lock` present.

### Key Dependencies

| Category | Packages |
|---|---|
| **Web Framework** | fastapi, uvicorn[standard] |
| **Data Processing** | pandas, numpy, pyarrow |
| **ML/DL** | scikit-learn, xgboost, imbalanced-learn, shap |
| **Serialization** | joblib |
| **API Utilities** | python-multipart, pydantic |

### Versioning Strategy

- **No version pins** — all packages are listed without version specifiers (e.g., `fastapi` instead of `fastapi==0.109.0`). This means `pip install -r requirements.txt` will install the latest available version of each package at install time.
- **High risk of reproducibility issues** — different environments may receive different dependency versions, potentially causing incompatibilities (especially critical for ML libraries like XGBoost and SHAP where API changes can break model loading).
- No virtual environment configuration (no `venv`, `conda`, or `pyproject.toml`) detected in the repository.

---

## Cross-Cutting Observations

### Strengths

1. **Standard tooling** — Each ecosystem uses its de facto standard package manager (Maven, npm, pip).
2. **Maven wrapper** — Ensures consistent Maven version across developer machines and CI.
3. **npm lockfile** — Provides deterministic frontend builds.
4. **Spring Boot parent POM** — Leverages curated dependency versions, reducing manual version management burden.

### Gaps & Risks

1. **No Python lockfile** — The ML service lacks any form of dependency pinning. Recommend adopting `pip-tools` (`requirements.in` + `requirements.txt` with hashes), Poetry, or at minimum adding explicit version pins to `requirements.txt`.
2. **No Maven lockfile alternative** — While the Spring Boot parent provides stability, there is no mechanism to detect transitive dependency drift. Consider using the [Maven Enforcer Plugin](https://maven.apache.org/enforcer/) or [Dependabot](https://dependabot.com/) for automated updates.
3. **No centralized update strategy** — Each component must be updated independently. No tooling (e.g., Renovate, Dependabot config) is present to automate dependency updates across all three ecosystems.
4. **No private registry configuration** — All dependencies come from public registries. If internal artifacts or private PyPI/npm packages are introduced in the future, additional configuration will be required.
5. **No vulnerability scanning** — No evidence of integrated SCA (Software Composition Analysis) tools such as OWASP Dependency-Check, Snyk, or npm audit hooks in CI.

---

## Developer Guidelines

1. **Backend (Maven)**:
   - Use `./mvnw` (Maven wrapper) instead of system `mvn` to ensure consistent builds.
   - Add new dependencies without explicit versions when a Spring Boot starter manages them; otherwise, declare versions in the `<properties>` block.
   - Run `./mvnw dependency:tree` to inspect transitive dependencies.

2. **Frontend (npm)**:
   - Always commit `package-lock.json` after modifying `package.json`.
   - Use `npm ci` (not `npm install`) in CI/CD pipelines for deterministic installs.
   - Avoid manually editing `package-lock.json`.

3. **ML Service (pip)**:
   - **Critical**: Pin all dependency versions in `requirements.txt` before deployment (e.g., `xgboost==2.0.3`).
   - Consider migrating to `poetry` or `pip-tools` for proper lockfile support.
   - Use a virtual environment (`python -m venv venv`) to isolate dependencies.
   - Regenerate and test dependencies after any Python version upgrade.