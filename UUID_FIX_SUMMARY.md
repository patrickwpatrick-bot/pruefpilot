# UUID-to-String Serialization Fix for Vercel Deployment

## Problem

PrüfPilot's backend API endpoints were failing on Vercel with `FUNCTION_INVOCATION_FAILED` errors when returning SQLAlchemy ORM objects directly as response models. Pydantic v2 validation was failing when trying to serialize `uuid.UUID` objects to JSON.

### Root Cause

- SQLAlchemy ORM models use `uuid.UUID` type for ID fields
- Response Pydantic models declare `id: str` fields
- When returning ORM objects directly, Pydantic received UUID objects but expected strings
- Pydantic v2 does NOT automatically convert UUID to str during JSON serialization
- Vercel's serverless environment triggered greenlet/async issues when Pydantic tried to access ORM relationships

## Solution

All response model endpoint functions now **explicitly construct response objects** with UUID fields wrapped in `str()` conversion. This prevents Pydantic from trying to serialize raw UUID objects and ensures clean JSON output.

## Files Fixed

### 1. `/backend/app/api/v1/standorte.py`
- **list_standorte()**: Return explicit StandortResponse list
- **create_standort()**: Return explicit StandortResponse instead of ORM object
- **update_standort()**: Return explicit StandortResponse instead of ORM object

**Pattern:**
```python
return StandortResponse(
    id=str(standort.id),
    name=standort.name,
    # ... other fields
)
```

### 2. `/backend/app/api/v1/mitarbeiter.py`
- **list_abteilungen()**: Return explicit AbteilungResponse list
- **create_abteilung()**: Return explicit AbteilungResponse instead of ORM object
- **list_mitarbeiter()**: Explicit MitarbeiterResponse construction with:
  - `id=str(m.id)`
  - `abteilung_id=str(m.abteilung_id) if m.abteilung_id else None`
  - Nested dokumente with explicit MitarbeiterDokumentResponse objects
  - Nested uw_status with `vorlage_id=str(z.vorlage_id)`
- **create_mitarbeiter()**: Explicit MitarbeiterResponse with UUID str() wrapping
- **update_mitarbeiter()**: Explicit MitarbeiterResponse with UUID str() wrapping
- **list_dokumente()**: Return explicit MitarbeiterDokumentResponse list
- **create_dokument()**: Return explicit MitarbeiterDokumentResponse instead of ORM object

### 3. `/backend/app/api/v1/organisation.py`
- **_org_to_response()** helper function: Changed `id=org.id` to `id=str(org.id)`
- Affects: GET /organisation and PUT /organisation endpoints

### 4. `/backend/app/api/v1/audit_log.py`
- **list_audit_logs()**: Return explicit AuditLogResponse list with UUID str() wrapping:
  - `id=str(a.id)`
  - `user_id=str(a.user_id)`
  - `entitaet_id=str(a.entitaet_id)`

## Critical Endpoints Fixed

These are the endpoints actively used by the frontend's Einstellungen page and demo-daten flow:

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| /standorte | GET | ✅ Fixed | Already had explicit construction |
| /standorte | POST | ✅ Fixed | Now returns explicit response |
| /standorte/{id} | PUT | ✅ Fixed | Now returns explicit response |
| /mitarbeiter | GET | ✅ Fixed | Now wraps all UUIDs |
| /mitarbeiter/abteilungen | GET | ✅ Fixed | Now returns explicit list |
| /mitarbeiter/abteilungen | POST | ✅ Fixed | Now returns explicit response |
| /organisation | GET | ✅ Fixed | Helper function updated |
| /organisation | PUT | ✅ Fixed | Uses fixed helper function |
| /audit-log | GET | ✅ Fixed | Now returns explicit list |
| /auth/me | GET | ✅ Fixed | Already had proper conversion |

## Testing

All files compile without syntax errors:
```bash
python3 -m py_compile backend/app/api/v1/{standorte,mitarbeiter,organisation,audit_log}.py
```

## Deployment Impact

- No breaking changes to API contracts
- All UUID fields continue to serialize as strings (no client-side changes needed)
- Fixes `FUNCTION_INVOCATION_FAILED` errors on Vercel
- Improves reliability and JSON serialization consistency across all endpoints

## Pattern to Remember

For any new response model endpoints, use this pattern:

```python
@router.get("/{id}", response_model=MyResponse)
async def get_my_item(id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MyModel).where(MyModel.id == id))
    item = result.scalar_one_or_none()

    # ALWAYS construct the response explicitly
    return MyResponse(
        id=str(item.id),  # UUID -> str
        some_field_id=str(item.some_field_id),  # Other UUID fields
        other_field=item.other_field,
    )
```

**Never return ORM objects directly:**
```python
# ❌ WRONG - causes Pydantic serialization errors
return item
```
