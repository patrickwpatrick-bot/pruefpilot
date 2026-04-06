"""
PrüfPilot API — Vercel Serverless Entry Point
Wraps the FastAPI app for Vercel's Python runtime.
"""
import sys
import os

# Backend-Modul in Python-Path einfügen
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Env-Defaults für Serverless (werden von Vercel Env Vars überschrieben)
os.environ.setdefault("APP_ENV", "production")

from app.main import app  # noqa: E402 — FastAPI ASGI app
