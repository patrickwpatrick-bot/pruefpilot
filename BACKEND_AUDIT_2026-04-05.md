# PrüfPilot Backend Audit — 2026-04-05

Kritischer Code-Review des Backends (FastAPI + SQLAlchemy + PostgreSQL).

---

## 🔴 KRITISCH (Security / Data-Loss)

| # | Kategorie | Datei:Zeile | Problem | Fix |
|---|-----------|-------------|---------|-----|
| 1 | Security / Multi-Tenant | `app/api/v1/maengel.py:86` | `Mangel` wird ohne `org_id`-Validierung gelesen — Attacker mit gültigem Token kann fremde Org-Mängel lesen | `.where(Mangel.pruefung_id.in_(pruefung_ids), Pruefung.organisation_id == org_id)` in Query ergänzen |
| 2 | Security / Multi-Tenant | `app/api/v1/formulare.py:62` | Form-Generator liest Vorlage ohne explizite Org-Isolation in Query | Jede `.where()` muss `Vorlage.organisation_id == org_id` enthalten |
| 3 | Security / File-Upload | `app/api/v1/upload.py:45` | Dateiendung wird direkt aus Input extrahiert — ermöglicht `.php`/`.sh` Upload → RCE-Risiko | Extension-Whitelist: `['jpg','jpeg','png','gif','webp','pdf']` + Content-Type via libmagic verifizieren + SVG blocken |
| 4 | Security / Config | `app/core/config.py:22` + `app/main.py:34` | `SECRET_KEY` default `"dev-secret-key-change-in-production"` — Server startet damit trotz Warnung | `if SECRET_KEY.startswith("dev-") and APP_ENV == "production": sys.exit(1)` |
| 5 | Data-Loss | `app/models/organisation.py:49-61` | 12+ Relations mit `cascade="all, delete-orphan"` — Org löschen löscht alles kaskadierend ohne Soft-Delete-Schutz | Soft-Delete-Flag oder `cascade="all"` ohne orphan-delete |
| 6 | Security / JWT | `app/core/security.py:32-42` | `decode_token()` + `get_current_org_id()` + `get_current_user_id()` einzeln genutzt — Token-Juggling möglich wenn Depends nicht strict validieren | Zentrale `get_current_session()` Dependency mit AND-Validierung von `sub` + `org` |
| 7 | Security / Rate-Limit | `app/api/v1/auth.py:29` | In-Memory `defaultdict(list)` — bei Restart geleert, kein Backoff, Memory-Leak | Datenbank-/Redis-gestützt + exponential backoff |
| 8 | Performance / N+1 | `app/api/v1/mitarbeiter.py:176` | `selectinload(...unterweisungs_zuweisungen).selectinload(...vorlage)` ohne Limit | Pagination + Lazy-Loading, separate Queries mit Limit |
| 9 | Security / Config | `app/api/v1/upload.py:16` | `UPLOAD_DIR` via `os.getcwd()` — relativ, unvorhersehbar, Path-Traversal-Risiko | Absoluten Pfad erzwingen oder Default `/app/uploads` |
| 10 | Security | `app/main.py:21-23` | Global `_rate_limit_store` dict wächst unbegrenzt → Memory Leak bei vielen IPs | TTL-Cache (`expiringdict`) oder Redis |

---

## 🟠 WICHTIG (Qualität / Business-Logic)

| # | Kategorie | Datei:Zeile | Problem | Fix |
|---|-----------|-------------|---------|-----|
| 11 | API-Design | `app/api/v1/maengel.py:26-46` | 3 verkettete Subqueries für Mangel-List — ineffizient, N+1-anfällig | `select(Mangel).join(Pruefung).join(User).filter(User.organisation_id == org_id)` direkt |
| 12 | Performance | `app/api/v1/mitarbeiter.py:214` | `compliance_prozent` wird in Python nach DB-Load berechnet | SQL `CASE` oder Aggregate-Query |
| 13 | Database | `app/core/database.py:36` | `commit()` im finally nach Exception-Rollback → Silent Corruption möglich | `commit()` nur im try-Block |
| 14 | Error-Handling | `app/api/v1/unterweisungen.py:661-664` | Generic `except Exception` versteckt Fehler in 500er | Explizite Exceptions + `logging.exception()` |
| 15 | Code-Duplikation | `app/api/v1/{organisation,mitarbeiter,checklisten}.py` | `_get_org_id()` + `_get_user_id()` in 5+ Dateien dupliziert | Zentral in `app/core/security.py` |
| 16 | Testing | `tests/conftest.py:15` | SQLite ohne `PRAGMA foreign_keys=ON` — ignoriert Cascades, Tests können falsch grün werden | `PRAGMA foreign_keys=ON` setzen oder Postgres-Test-DB |
| 17 | API-Design | `app/api/v1/arbeitsmittel.py:45-74` | List-Response ohne `page/per_page/total_pages` | Pagination-Fields in Response |
| 18 | Database | `app/models/arbeitsmittel.py` | Keine unique Constraint `(organisation_id, name)` — Duplikate möglich | `UniqueConstraint('organisation_id', 'name')` |
| 19 | Logging | `app/main.py:14` | Logger angelegt, aber keine Request/Response Logs | Middleware für structured logging |
| 20 | Config | `app/core/plan_limits.py:147` | `should_add_wasserzeichen()` unused — Wasserzeichen wird immer gesetzt | Aufrufen in FormularGenerator oder entfernen |

---

## 🟡 NICE-TO-HAVE

| # | Kategorie | Datei:Zeile | Problem | Fix |
|---|-----------|-------------|---------|-----|
| 21 | Performance | `app/api/v1/pruefungen.py:37-79` | List lädt alle punkte+maengel via selectinload | Nur ID/Name/Status in List, Details erst in `/:id` |
| 22 | UX | `app/api/v1/auth.py:85` | 429 ohne `Retry-After` Header | `response.headers["Retry-After"] = "300"` |
| 23 | API-Design | `app/schemas/pruefung.py:50-59` | `PruefPunktResponse` ohne `pruef_punkt_text` — Client weiß nicht was geprüft wurde | `beschreibung` vom ChecklistenPunkt includen |
| 24 | Validation | `app/models/unterweisung.py:28` | `intervall_monate` ohne Bereichs-Validierung | `Field(..., ge=1, le=120)` |
| 25 | Ops | `app/core/config.py:15` | `DEBUG: bool = True` default | Default `False` + Prod-Validierung |
| 26 | Validation | `app/schemas/auth.py:10` | Passwort nur minLength=8, keine Komplexitäts-Anforderung | Pydantic-Validator (NIST-konform) |
| 27 | Monitoring | `app/main.py:44-47` | Scheduler startet silent-fail | Structured logging + Alert |
| 28 | Documentation | `app/models/*.py` | Keine Docstrings auf Models, FK-Cascade undokumentiert | Docstrings + FK-Diagramm |

---

## Testing-Lücken
- Cross-Tenant-Access-Tests fehlen komplett
- Rate-Limiting-Bypass nicht getestet
- JWT-Token-Replay nicht getestet
- Cascade-Delete-Integrität nicht getestet
- File-Upload-RCE-Schutz nicht getestet

## Zusammenfassung
Backend strukturell solide, aber **nicht prod-reif**. Vor Launch zwingend:
1. org_id-Validation in allen Queries (sonst DSGVO-Risiko)
2. File-Upload-Sicherheit (Extension-Whitelist)
3. Token-Management (Revocation, Secret-Guard)
4. N+1 Queries beheben
5. Multi-Tenant- und Security-Tests
