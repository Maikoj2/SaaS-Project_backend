# TENANT_RESOLUTION_TEST_PLAN.md

**Sprint:** Day 4 — Tenant Resolution and Isolation Verification  
**Date:** 2026-06-04  
**Role:** Senior Security Engineer & Senior Backend Architect  

This document outlines the test cases, setup conditions, and expected results for validating the tenant resolution logic in `checkDomain` middleware and Passport JWT authentication.

---

## 1. Environment Configurations

- **`SYSTEM_SUBDOMAINS`** (in `.env`): `api,www,admin,assets,static,app`
- **`JWT_REFRESH_EXPIRATION`**: `7d`

---

## 2. Test Cases Matrix

| Case ID | Scenario | Headers | Host Header | URL Path | JWT Claims | Expected Result |
|---------|----------|---------|-------------|----------|------------|-----------------|
| **TC-01** | Valid Host Subdomain | None | `tenant1.domain.com` | `/api/v1/championships` | N/A | **PASS:** `req.clientAccount = 'tenant1'`, proceeds to `next()` |
| **TC-02** | Valid X-Tenant-ID Header | `X-Tenant-ID: tenant1` | `api.domain.com` | `/api/v1/championships` | N/A | **PASS:** `req.clientAccount = 'tenant1'`, proceeds to `next()` |
| **TC-03** | X-Tenant-ID vs Host Subdomain Mismatch | `X-Tenant-ID: tenant1` | `tenant2.domain.com` | `/api/v1/championships` | N/A | **FAIL:** HTTP `400 Bad Request` (Tenant mismatch between header and host) |
| **TC-04** | Valid JWT Tenant Matching Host | None | `tenant1.domain.com` | `/api/v1/championships` | `{ "tenant": "tenant1" }` | **PASS:** Authenticated successfully, user loaded under `tenant1` |
| **TC-05** | JWT Tenant vs Host Subdomain Mismatch | None | `tenant2.domain.com` | `/api/v1/championships` | `{ "tenant": "tenant1" }` | **FAIL:** HTTP `401 Unauthorized` (Tenant context mismatch) |
| **TC-06** | Missing Tenant Context | None | `domain.com` (no subdomain) | `/api/v1/championships` | N/A | **FAIL:** HTTP `403 Forbidden` (Invalid or missing tenant origin) |
| **TC-07** | Reserved Subdomain Access | None | `api.domain.com` | `/api/v1/championships` | N/A | **FAIL:** HTTP `403 Forbidden` (Invalid or missing tenant origin - reserved subdomain) |
| **TC-08** | Public Route Verification Path (verify) | None | `api.domain.com` (reserved) | `/api/v1/auth/verify/tenant1/code123` | N/A | **PASS:** `req.clientAccount = 'tenant1'`, proceeds to controller |
| **TC-09** | Public Route Reset Password Path (reset) | None | `api.domain.com` (reserved) | `/api/v1/auth/reset-password/tenant1/token123` | N/A | **PASS:** `req.clientAccount = 'tenant1'`, proceeds to controller |

---

## 3. Verification & Execution Plan

### Manual Verification (via `curl` or Postman)

#### Test TC-01: Valid Subdomain
```bash
curl -X GET http://localhost:8000/api/v1/check \
  -H "Host: tenant1.localhost:8000"
```
*Expected:* HTTP `200 OK` (or appropriate response showing tenant exists / is processed).

#### Test TC-02: Valid Header
```bash
curl -X GET http://localhost:8000/api/v1/check \
  -H "Host: api.localhost:8000" \
  -H "X-Tenant-ID: tenant1"
```
*Expected:* HTTP `200 OK`.

#### Test TC-03: Header vs Host Mismatch
```bash
curl -X GET http://localhost:8000/api/v1/check \
  -H "Host: tenant2.localhost:8000" \
  -H "X-Tenant-ID: tenant1"
```
*Expected:* HTTP `400 Bad Request` or `403 Forbidden` indicating mismatch.

#### Test TC-06: Missing Tenant Context
```bash
curl -X GET http://localhost:8000/api/v1/check \
  -H "Host: localhost:8000"
```
*Expected:* HTTP `403 Forbidden` ("Invalid or missing tenant origin").

#### Test TC-07: Reserved Subdomain
```bash
curl -X GET http://localhost:8000/api/v1/check \
  -H "Host: api.localhost:8000"
```
*Expected:* HTTP `403 Forbidden`.

#### Test TC-08: Path-Based Public Route Fallback
```bash
curl -X POST http://localhost:8000/api/v1/auth/verify/tenant1/code123 \
  -H "Host: api.localhost:8000"
```
*Expected:* Enters the verify route handler for `tenant1` (will respond with `404` or `401` based on verification code validity, but **not** blocked by `checkDomain` middleware).
