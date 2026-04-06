"""
Auth Schemas - Registration, Login, Token
"""
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    passwort: str = Field(..., min_length=8, max_length=128)
    vorname: str = Field(..., min_length=1, max_length=100)
    nachname: str = Field(..., min_length=1, max_length=100)
    firmenname: str = Field(..., min_length=1, max_length=255)
    branche: str = Field(..., min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    passwort: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    vorname: str
    nachname: str
    rolle: str
    organisation_id: str

    class Config:
        from_attributes = True
