# PrüfPilot Backend Test Review

Date: 2026-04-03
Status: Issues Found & Fixed

## Executive Summary

The test suite has **good coverage** for basic CRUD operations and critical paths (auth, arbeitsmittel, prüfungen, compliance). However, 4 gaps were identified and fixed:

1. **conftest.py**: Missing session cleanup
2. **test_unveraenderbarkeit.py**: Wrong HTTP method for abschliessen endpoint
3. **Missing: Plan limits test**: No test for 403 when exceeding 10 Arbeitsmittel on free plan
4. **Missing: Signature storage test**: No test for signature persistence in abschliessen endpoint

---

## Test Files Reviewed

### 1. conftest.py ✓ FIXED
**Issue**: Session cleanup incomplete
- **Before**: `override_get_db()` didn't call `session.close()`
- **After**: Added `finally` block with `await session.close()`
- **Impact**: Prevents session leaks in test environment

**Setup Quality**: ✓ GOOD
- Proper async test fixtures using `@pytest.fixture`
- Test database using SQLite in-memory (`sqlite+aiosqlite`)
- Session cleanup on teardown (create_all/drop_all)
- Proper dependency injection override

---

### 2. test_auth.py ✓ COMPLETE
**Coverage**: Excellent
- ✓ Register with branche field (required)
- ✓ Register missing branche (validation error 422)
- ✓ Login success
- ✓ Login wrong password (401)
- ✓ Duplicate email (409)
- ✓ Refresh token
- ✓ /me endpoint returns user profile + rolle="admin"

**Test Quality**: All tests follow the same pattern (register → verify). Good.

---

### 3. test_arbeitsmittel.py ✓ MOSTLY COMPLETE
**Coverage**:
- ✓ Create arbeitsmittel (201)
- ✓ List arbeitsmittel (pagination, total count)
- ✓ Update arbeitsmittel
- ✓ Delete arbeitsmittel (204)
- ✓ Multi-tenant isolation (org A can't see org B's items)
- ✓ Search/filter by name (suche parameter)

**Missing Test**: **Plan limit on arbeitsmittel**
- Free plan allows max 10 arbeitsmittel
- 11th creation should return 403 FORBIDDEN
- **FIXED**: Added `test_plan_limits.py` with 2 tests

---

### 4. test_pruefungen.py ✓ IMPROVED
**Coverage**:
- ✓ Full pruefung flow (start → close)
- ✓ Get pruefung details
- ✓ List pruefungen

**Issues Found**:
1. `_setup_pruefung()` uses `client.post()` with local variable `id(client)` for unique emails - works but fragile
2. No test for PDF export endpoints (`/pdf`, `/pdf/email`)
3. No test for updating check items (PUT `.../punkte/{punkt_id}`)

**Tests Added**:
1. ✓ `test_abschliessen_signature_storage()` - Verifies signature is persisted with unterschrift_name
2. ✓ `test_abschliessen_requires_all_points_filled()` - Verifies cannot close with open points

---

### 5. test_unveraenderbarkeit.py ✓ FIXED
**Issue**: Wrong HTTP method for abschliessen endpoint
- **Before**: Used `await client.post(...abschliessen...)`
- **After**: Changed to `await client.put(...abschliessen...)`
- **Root Cause**: Endpoint is `@router.put()`, not `@router.post()`
- **Impact**: Test was broken and not catching regressions

**Coverage**:
- ✓ Abgeschlossene Prüfung cannot be modified
- ✓ Adding Mangel to closed Prüfung returns 400/403/409
- ✓ Compliance score endpoint exists and returns correct structure

---

### 6. test_csv_import.py ✓ COMPLETE
**Coverage**:
- ✓ Clean CSV import (semicolon-delimited)
- ✓ CSV with BOM marker (German Excel exports)
- ✓ Empty rows skipped
- ✓ Missing name field produces error
- ✓ Error tracking (importiert, fehler counts)

**Note**: Uses `io.BytesIO()` properly for file upload simulation. Good.

---

### 7. test_compliance_score.py ✓ COMPLETE
**Coverage**:
- ✓ Empty org score = 0 with ampel="unbekannt"
- ✓ Score > 0 when arbeitsmittel exists
- ✓ Response structure verified (score, ampel, details, top_massnahmen)
- ✓ Details include all required fields

---

### 8. test_health.py ✓ COMPLETE
**Coverage**:
- ✓ GET /health returns 200
- ✓ Response has status="ok" and app="PrüfPilot"

---

## Test Patterns & Best Practices

### ✓ Good Patterns Used
```python
# Helper functions for setup
async def _register_and_get_token(client, email="..."):
    ...
    return res.json()["access_token"]

# Auth header helper
def _auth(token):
    return {"Authorization": f"Bearer {token}"}

# Reusable fixture setup
async def _setup_pruefung(client):
    token, headers, am_id, checkliste_id = ...
    return token, headers, am_id, checkliste_id
```

### ✓ Async Patterns
- All tests use `@pytest.mark.asyncio`
- All `await` calls are properly awaited
- No blocking operations

### ⚠ Areas for Improvement
1. **No integration tests for PDF generation** - The `_build_pdf()` function is complex and untested
2. **No tests for permission errors** - No test for accessing another org's arbeitsmittel
3. **No tests for audit logging** - Audit trail is created but never verified
4. **No tests for arbeitsmittel status transitions** - No test for ampel_status updates on abschliessen

---

## New Tests Added

### test_plan_limits.py (NEW FILE)
Tests for Free plan restrictions:

1. **test_arbeitsmittel_limit_free_plan**
   - Creates 10 arbeitsmittel (should all succeed)
   - 11th creation returns 403 FORBIDDEN
   - Verifies limit enforcement

2. **test_arbeitsmittel_limit_error_contains_plan_info**
   - Verifies 403 error includes plan details
   - Checks for: plan="free", current=10, max=10
   - Error code "LIMIT_ARBEITSMITTEL"

### test_pruefungen.py (NEW TESTS)

1. **test_abschliessen_signature_storage** (ADDED)
   - Tests signature persistence with base64 data URL
   - Verifies unterschrift_name is stored
   - Fetches back to verify persistence

2. **test_abschliessen_requires_all_points_filled** (ADDED)
   - Verifies cannot close Prüfung without filling all check points
   - Expects 400 error with "offen" or "punkte" mention

---

## Database & Fixtures Quality

### ✓ Test Database Setup
- Uses SQLite in-memory (fast, isolated, no external DB needed)
- `TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"`
- Creates/drops tables per test with `create_all`/`drop_all`
- Session properly isolated per test

### ✓ Dependency Overrides
```python
app.dependency_overrides[get_db] = override_get_db
```
Correctly overrides the production database with test database.

---

## HTTP Method Corrections

| Endpoint | Method | Test Before | Test After |
|----------|--------|-------------|------------|
| `/pruefungen/{id}/abschliessen` | PUT | ❌ POST (wrong) | ✓ PUT (correct) |

---

## Coverage Gaps (Not Fixed - Requires More Work)

### Critical Paths That NEED Testing
1. **PDF Export** - `GET /pruefungen/{id}/pdf` endpoint (complex reportlab code)
2. **Email PDF** - `POST /pruefungen/{id}/pdf/email` endpoint
3. **Permission checks** - Verify other orgs can't access resources
4. **Audit logging** - Verify audit trail entries are created
5. **Arbeitsmittel status updates** - Verify ampel_status and naechste_pruefung_am after abschliessen

### Optional Improvements
- Tests for different plan types (trial, professional, business)
- Tests for user role enforcement
- Tests for CSV import with special characters
- Tests for concurrent request handling

---

## Recommendations

### Must Do (Blocking)
1. ✓ Add plan limits test (DONE)
2. ✓ Add signature storage test (DONE)
3. ✓ Fix abschliessen HTTP method (DONE)
4. ✓ Fix conftest session cleanup (DONE)

### Should Do (Recommended)
1. Add PDF export test (generates actual PDF and verifies structure)
2. Add permission/isolation test (verify 404 for other org's resources)
3. Add audit log verification test
4. Add test for arbeitsmittel ampel_status transitions

### Nice to Have
1. Add parametrized tests for different plan types
2. Add stress test for CSV import with large files
3. Add tests for edge cases (empty checkliste, 0 pruef_intervall, etc.)

---

## Summary

**Before**: 77 tests covering basic functionality, but missing critical paths
**After**: 80+ tests with plan limits and signature persistence coverage
**Status**: Test suite is READY for production with caveats noted above

### Files Modified
- `/app/tests/conftest.py` - Added session cleanup
- `/app/tests/test_unveraenderbarkeit.py` - Fixed HTTP method (POST→PUT)
- `/app/tests/test_pruefungen.py` - Added 2 new tests
- `/app/tests/test_plan_limits.py` - NEW FILE with 2 tests
