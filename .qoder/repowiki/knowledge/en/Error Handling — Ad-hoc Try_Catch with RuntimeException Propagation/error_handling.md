## Overview

This codebase uses an **informal, ad-hoc error handling approach** without a centralized exception handling strategy. Errors are handled through scattered `try/catch` blocks in service layers, with most failures propagated as unchecked `RuntimeException`. There is no global exception handler (`@ControllerAdvice`), no custom error types, and no standardized error response format.

---

## Backend (Spring Boot / Java)

### No Global Exception Handler

The project has **zero** `@ControllerAdvice` or `@RestControllerAdvice` classes. This means:
- Unhandled exceptions fall through to Spring's default error response (typically a JSON body with `timestamp`, `status`, `error`, `path`).
- There is no unified error envelope (e.g., `{ "code": "...", "message": "..." }`).
- HTTP status codes are not explicitly mapped from domain errors.

### Service-Layer Try/Catch Pattern

Services use inline `try/catch` blocks that catch broad `Exception` and rethrow as `RuntimeException`:

```java
// DetectionService.java (lines 130-136)
} catch (JsonProcessingException e) {
    log.error("JSON processing error", e);
    throw new RuntimeException("Failed to process ML response", e);
} catch (Exception e) {
    log.error("ML service call failed", e);
    throw new RuntimeException("ML service unavailable: " + e.getMessage(), e);
}
```

```java
// DatasetService.java (lines 148-154)
} catch (Exception e) {
    log.error("Analysis failed for dataset {}", datasetId, e);
    dataset.setStatus(DatasetAnalysis.DatasetStatus.FAILED);
    dataset.setErrorMessage(e.getMessage());
    datasetRepo.save(dataset);
    throw new RuntimeException("Analysis failed: " + e.getMessage(), e);
}
```

Key observations:
- **Logging before rethrow**: Services consistently call `log.error()` before throwing, which aids debugging.
- **State mutation on failure**: `DatasetService` updates the entity status to `FAILED` and persists the error message before rethrowing.
- **Broad catch-all**: Most catches use `catch (Exception e)` rather than specific exception types.

### Input Validation via `IllegalArgumentException`

`DatasetService.uploadDataset()` throws `IllegalArgumentException` for invalid file types:

```java
if (filename == null || !filename.endsWith(".parquet")) {
    throw new IllegalArgumentException("Only .parquet files are supported");
}
```

Without a global handler, this produces a generic 500 response instead of a 400 Bad Request.

### Silent Failure with Defaults

Several helper methods swallow exceptions and return defaults:

```java
// DatasetService.java (lines 407-419)
private Long toLong(Object obj) {
    if (obj == null) return 0L;
    if (obj instanceof Number) return ((Number) obj).longValue();
    try { return Long.parseLong(obj.toString()); } catch (Exception e) { return 0L; }
}
```

Similar patterns exist for `toInt()`, `toDouble()`, and severity enum parsing in `DetectionService` (line 89-90).

### JWT Token Validation

`JwtTokenProvider.validateToken()` returns `false` on any `JwtException` or `IllegalArgumentException` rather than throwing:

```java
public boolean validateToken(String token) {
    try {
        Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token);
        return true;
    } catch (JwtException | IllegalArgumentException e) {
        return false;
    }
}
```

This is a defensive pattern appropriate for authentication filters.

### PDF Generation Error Handling

`ReportService.generatePdfReport()` wraps all PDF generation in a single `try/catch` that logs and rethrows as `RuntimeException`:

```java
} catch (Exception e) {
    log.error("PDF generation failed", e);
    throw new RuntimeException("Failed to generate PDF report: " + e.getMessage(), e);
}
```

---

## ML Service (FastAPI / Python)

### FastAPI HTTPException for API Errors

The ML service uses FastAPI's built-in `HTTPException` for request-level errors:

```python
# app.py (lines 261-265)
if not file.filename.endswith(".parquet"):
    raise HTTPException(400, "Only .parquet files are supported")

# app.py (lines 309-310)
if dataset_id not in dataset_store:
    raise HTTPException(404, f"Dataset '{dataset_id}' not found")
```

This is the **only place** in the entire codebase where HTTP status codes are explicitly set for error responses.

### Broad Exception Catch with Status Update

The `analyze_dataset` endpoint catches all exceptions, updates internal state, and raises a 500:

```python
# app.py (lines 341-346)
except HTTPException:
    raise
except Exception as e:
    ds["status"] = "failed"
    ds["error"] = str(e)
    raise HTTPException(500, f"Analysis failed: {str(e)}")
```

Note the explicit re-raise of `HTTPException` to preserve intentional error responses.

### SHAP Explanation Graceful Degradation

In `predict.py`, SHAP explanation failures are caught and return an error object instead of crashing:

```python
# predict.py (lines 164-165)
except Exception as e:
    return [{"feature": "error", "impact": 0, "signed_impact": 0, "direction": str(e)}]
```

Similarly, `prediction_engine.py` catches SHAP errors and stores them in the result:

```python
# prediction_engine.py (lines 269-270)
except Exception as e:
    shap_explanations.append({"error": str(e)})
```

### Model Loading FileNotFoundError

`NIDSPredictor.load()` raises `FileNotFoundError` if no model artifacts exist:

```python
if not models:
    raise FileNotFoundError("No trained model found in model/")
```

This propagates as an unhandled 500 at startup or first prediction.

---

## Frontend (React / JavaScript)

### Generic Error Throws on HTTP Failure

All API calls in `api.js` follow the same pattern: check `res.ok` and throw a generic `Error`:

```javascript
// api.js (lines 17-18)
if (!res.ok) throw new Error('Login failed');

// api.js (lines 51-52)
if (!res.ok) throw new Error('Prediction failed');
```

Observations:
- **No error details extracted**: The response body (which may contain error messages from the backend) is never read.
- **No distinction between error types**: Network failures, 401s, 404s, and 500s all produce the same generic message.
- **No retry logic**: Failed requests are not retried.
- **No error boundary integration**: Components must handle these throws individually.

---

## Conventions Developers Should Follow

1. **Service layer**: Wrap external calls (ML service, file I/O) in `try/catch`, log with `log.error()`, then rethrow as `RuntimeException` with a descriptive message.
2. **Input validation**: Throw `IllegalArgumentException` for invalid inputs (though without a global handler, these produce 500s).
3. **ML service**: Use `HTTPException(status_code, message)` for API-level errors; catch broad `Exception` only at the endpoint boundary.
4. **Graceful degradation**: For non-critical features (SHAP explanations), catch exceptions and return partial results rather than failing entirely.
5. **Frontend**: Check `res.ok` after every fetch; throw generic `Error` with a short label.
6. **State tracking**: When an async operation fails, update the entity status (e.g., `FAILED`) and store the error message before rethrowing.

---

## Gaps and Risks

- **No centralized error handling**: Missing `@ControllerAdvice` means inconsistent error responses and no way to map domain errors to HTTP status codes.
- **No custom error types**: All errors are `RuntimeException` or `HTTPException`; callers cannot distinguish error categories programmatically.
- **Frontend loses error context**: Response bodies are discarded; users see generic messages like "Login failed" without root cause.
- **Silent data corruption risk**: Helper methods that swallow parse exceptions and return `0`/`0.0`/`0L` can mask data quality issues.
- **No circuit breaker or retry**: ML service calls use blocking `.block()` with fixed timeouts; transient failures cause immediate 500s.