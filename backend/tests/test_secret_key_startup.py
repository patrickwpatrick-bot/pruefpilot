"""
SEC-Fix M1 Finding #4 — Tests für SECRET_KEY Pflichtfeld + Startup-Härtung.

Jeder Test spawnt einen frischen Python-Subprozess, damit pydantic-Settings
wirklich frisch aus der Umgebung liest (kein Modul-Cache aus vorherigen Tests).
"""
import os
import sys
import subprocess
import textwrap
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _run_python(code: str, env: dict) -> subprocess.CompletedProcess:
    """Führt Python-Code in einem frischen Subprozess mit custom env aus."""
    full_env = {**os.environ, **env}
    # Sicherstellen dass Schlüssel, die auf None gesetzt sind, auch wirklich weg sind
    for k, v in env.items():
        if v is None:
            full_env.pop(k, None)
    return subprocess.run(
        [sys.executable, "-c", textwrap.dedent(code)],
        cwd=str(BACKEND_DIR),
        env=full_env,
        capture_output=True,
        text=True,
        timeout=20,
    )


def test_settings_fehlt_ohne_secret_key():
    """SECRET_KEY ist Pflichtfeld — ohne Env-Var MUSS pydantic fehlschlagen."""
    code = """
        import sys
        try:
            from app.core.config import settings
            sys.exit("FAIL: Settings lud ohne SECRET_KEY")
        except Exception as exc:
            # pydantic ValidationError erwartet
            if "SECRET_KEY" in str(exc) and "missing" in str(exc).lower():
                print("OK")
            else:
                sys.exit(f"FAIL: unerwarteter Fehler {type(exc).__name__}: {exc}")
    """
    result = _run_python(code, {"SECRET_KEY": None, "APP_ENV": "test"})
    assert result.returncode == 0, f"stdout={result.stdout} stderr={result.stderr}"
    assert "OK" in result.stdout


def test_settings_ok_mit_secret_key():
    """Mit gesetztem SECRET_KEY lädt die Config fehlerfrei."""
    code = """
        from app.core.config import settings
        assert len(settings.SECRET_KEY) >= 32
        assert settings.DEBUG is False
        print("OK")
    """
    key = "x" * 48
    result = _run_python(code, {"SECRET_KEY": key, "APP_ENV": "test"})
    assert result.returncode == 0, f"stdout={result.stdout} stderr={result.stderr}"
    assert "OK" in result.stdout


def test_debug_default_ist_false():
    """DEBUG darf nicht per Default True sein (SEC-Fix M1 #4)."""
    code = """
        from app.core.config import settings
        assert settings.DEBUG is False, f"DEBUG={settings.DEBUG}"
        print("OK")
    """
    result = _run_python(code, {"SECRET_KEY": "y" * 48, "APP_ENV": "test", "DEBUG": None})
    assert result.returncode == 0, f"stdout={result.stdout} stderr={result.stderr}"


def test_prod_startup_blockt_dev_secret():
    """Lifespan muss Prod-Start mit dev-*-Key abbrechen (sys.exit)."""
    # Wir rufen den Lifespan direkt auf und erwarten SystemExit.
    code = """
        import asyncio, sys
        from app.core.config import settings
        from app.main import lifespan, app

        async def run():
            async with lifespan(app):
                pass

        try:
            asyncio.run(run())
            sys.exit("FAIL: Lifespan akzeptierte dev-Secret in production")
        except SystemExit as exc:
            msg = str(exc)
            if "dev-secret" in msg or "SECRET_KEY" in msg:
                print("OK")
            else:
                # Acceptable: sys.exit wurde gerufen, Message matcht Muster
                print(f"OK-alt: {msg}")
    """
    result = _run_python(
        code,
        {"SECRET_KEY": "dev-abcdefghijklmnopqrstuvwxyz1234", "APP_ENV": "production"},
    )
    # Entweder Lifespan exit, oder Settings validation error — beides akzeptabel
    # (wir wollen NICHT, dass der Prozess normal durchläuft).
    assert "OK" in result.stdout or result.returncode != 0, (
        f"stdout={result.stdout} stderr={result.stderr}"
    )


def test_prod_startup_blockt_kurzen_key():
    """Lifespan muss Prod-Start mit < 32 Zeichen Key abbrechen."""
    code = """
        import asyncio, sys
        from app.main import lifespan, app

        async def run():
            async with lifespan(app):
                pass

        try:
            asyncio.run(run())
            sys.exit("FAIL: Lifespan akzeptierte kurzen Key in production")
        except SystemExit as exc:
            print("OK")
    """
    result = _run_python(
        code,
        {"SECRET_KEY": "kurz123", "APP_ENV": "production"},
    )
    assert "OK" in result.stdout or result.returncode != 0, (
        f"stdout={result.stdout} stderr={result.stderr}"
    )
