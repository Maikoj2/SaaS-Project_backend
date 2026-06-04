# AUTH_AUDIT_REPORT.md

**Proyecto:** SAAS-Project-BackEnd — Módulo de autenticación  
**Fecha:** 2026-06-04  
**Alcance:** AuthController, AuthService, TokenService, User Model, Passport/JWT, middlewares de auth, utilidades de contraseña, rutas auth, forgot-password, auth social (comentado)  
**Metodología:** Revisión estática de código — sin ejecución ni modificación de código  
**Roles:** Senior Security Engineer + Senior Backend Architect  

---

## Executive Summary

El módulo de autenticación combina **JWT stateless**, **tokens encapsulados cifrados (AES-256-CBC)**, **bcrypt** para contraseñas y **multi-tenancy por subdominio (`Origin`)**. Existen controles parciales (intentos de login, verificación de email, validación express-validator), pero hay **hallazgos críticos de logging de credenciales/tokens**, **doble pipeline de autenticación inconsistente**, **desacople tenant↔usuario en Passport**, y **errores de configuración en expiración del refresh token**.

| Severidad | Cantidad |
|-----------|----------|
| Critical  | 4        |
| High      | 12       |
| Medium    | 14       |
| Low       | 8        |

---

## Componentes revisados

| Componente | Ubicación |
|------------|-----------|
| AuthController | `src/api/controllers/auth/auth.controller.ts` |
| AuthService | `src/api/services/auth/auth.service.ts` |
| TokenService | `src/api/services/auth/token.service.ts` |
| User Model | `src/api/models/mongoose/user/User.ts` |
| ForgotPassword Model | `src/api/models/mongoose/forgotPassword.model.ts` |
| Passport JWT | `src/api/config/passport/passport.ts` |
| auth.middleware | `src/api/middlewares/auth.middleware.ts` |
| roleAuthorization | `src/api/middlewares/auth/roleAuthorization.middleware.ts` |
| origin (tenant) | `src/api/middlewares/auth/origin.ts` |
| PasswordUtil | `src/api/utils/password.util.ts` |
| Crypto (encrypt/decrypt) | `src/api/utils/crypto.ts` |
| Validators | `src/api/validators/auth/*`, `expressValidatorHelper/checkFieldTovalidate.ts` |
| Routes | `src/api/routes/auth/auth.ts` |
| Auth config | `src/api/config/auth/auth.config.ts`, `env.config.ts` |
| Request logging | `src/api/models/server/server.ts` |

---

## Findings

### AUTH-001 — Tokens de sesión registrados en logs (login)

| Campo | Detalle |
|-------|---------|
| **Severity** | **Critical** |
| **Description** | Tras un login exitoso, `AuthController.login` registra el objeto `result.session` completo (Bearer + payload cifrado con access y refresh JWT). |
| **Impact** | Compromiso total de sesión si los logs se almacenan en agregadores, backups o son accesibles por operadores. Viola explícitamente `BUSINESS_RULES.md` (“Tokens must never be logged”). |
| **Recommended Fix** | Eliminar el log del token; registrar solo `userId` y `tenant` (sin PII sensible). Añadir lint/revisión de PR que prohíba loguear `authorization`, `session`, `token`, `password`. |

**Referencia:** `auth.controller.ts` líneas 61–64.

---

### AUTH-002 — Contraseña en texto plano registrada en reset password

| Campo | Detalle |
|-------|---------|
| **Severity** | **Critical** |
| **Description** | `AuthController.resetPassword` hace `logger.info` incluyendo `newPassword` en el payload del log. |
| **Impact** | Exposición permanente de la nueva contraseña en sistemas de logging; incumplimiento grave de OWASP (Sensitive Data Exposure) y reglas de negocio de seguridad. |
| **Recommended Fix** | Nunca registrar contraseñas ni campos de credenciales. Loguear solo `tenant`, `urlId` (o hash del token), y resultado de la operación. |

**Referencia:** `auth.controller.ts` líneas 171–175.

---

### AUTH-003 — Body completo de requests registrado globalmente

| Campo | Detalle |
|-------|---------|
| **Severity** | **Critical** |
| **Description** | El middleware global del servidor registra `req.body` en cada petición (`login`, `register`, `reset-password`, etc.). |
| **Impact** | Contraseñas y tokens enviados en body quedan en logs de aplicación. Superficie de fuga masiva en producción. |
| **Recommended Fix** | Redactar campos sensibles (`password`, `newPassword`, `oldPassword`, `authorization`, `token`) antes de loguear; desactivar body logging en rutas de auth o en `NODE_ENV=production`. |

**Referencia:** `server.ts` líneas 54–60.

---

### AUTH-004 — Refresh token JWT usa secreto como `expiresIn`

| Campo | Detalle |
|-------|---------|
| **Severity** | **Critical** |
| **Description** | En `TokenService`, `REFRESH_TOKEN_EXPIRY` se asigna a `env.JWT_REFRESH_SECRET` (clave secreta), no a una duración (`7d`, `30d`). Ese valor se pasa a `jwt.sign(..., { expiresIn: this.REFRESH_TOKEN_EXPIRY })`. |
| **Impact** | Comportamiento impredecible: firma de refresh inválida, expiración errónea o fallos en runtime. La rotación de sesión y el flujo de refresh pueden quedar rotos o con TTL no controlado. |
| **Recommended Fix** | Introducir `JWT_REFRESH_EXPIRATION` (ej. `7d`) separado de `JWT_REFRESH_SECRET`. Validar en `env.config` que `expiresIn` sea formato válido. Añadir tests unitarios de generación/verificación de pares de tokens. |

**Referencia:** `token.service.ts` líneas 16, 51–55.

---

### AUTH-005 — Passport resuelve usuario sin filtro de tenant

| Campo | Detalle |
|-------|---------|
| **Severity** | **High** |
| **Description** | La estrategia JWT ejecuta `User.findById(jwt_payload.userId)` sin `byTenant(tenant)` ni comprobación de que el usuario pertenece al `clientAccount` del request. |
| **Impact** | **Broken Access Control (OWASP A01):** un JWT válido de un usuario en tenant A podría autorizar operaciones si el cliente envía `Origin` de tenant B, siempre que exista el mismo `userId` o haya colisión de IDs (ObjectId únicos globalmente mitigan parcialmente, pero no el modelo mental ni futuros cambios). |
| **Recommended Fix** | En `passReqToCallback`, exigir `req.clientAccount`, cargar `User.byTenant(tenant).findById(userId)`, rechazar si no existe. Incluir `tenantId` en el payload JWT y validar `payload.tenant === req.clientAccount`. |

**Referencia:** `passport.ts` líneas 31–40.

---

### AUTH-006 — JWT sin claim de tenant; desacople request ↔ identidad

| Campo | Detalle |
|-------|---------|
| **Severity** | **High** |
| **Description** | El payload JWT solo contiene `{ userId, type }`. No hay `tenant`, `role` ni `jti` (token id). |
| **Impact** | Imposible validar de forma criptográfica que la sesión pertenece al tenant del subdominio; dependencia total de headers manipulables y lógica dispersa en middlewares. |
| **Recommended Fix** | Emitir `tenant` (y opcionalmente `role`) en access/refresh; validar en cada capa de auth. Considerar `aud`/`iss` por entorno. |

**Referencia:** `token.service.ts` líneas 8–11, 46–54.

---

### AUTH-007 — Endpoint de refresh valida access token, no refresh token

| Campo | Detalle |
|-------|---------|
| **Severity** | **High** |
| **Description** | `AuthService.refreshToken` usa `tokenService.getUserIdFromToken()`, que desencripta el blob y ejecuta `jwt.verify(tokens.accessToken, JWT_SECRET)` — no verifica el refresh token ni su `type: 'refresh'`. |
| **Impact** | Semántica incorrecta: el endpoint `/refresh-token` no cumple el contrato habitual de refresh; si el access expira, `getUserIdFromToken` falla aunque el refresh sea válido (salvo que `auth.middleware` intercepte con `refreshTokens`). Confusión y bypass potencial si alguna ruta usa solo `getUserIdFromToken`. |
| **Recommended Fix** | Crear `getUserIdFromRefreshToken()` que verifique `tokens.refreshToken` con `JWT_REFRESH_SECRET` y `type === 'refresh'`. El endpoint refresh debe usar solo ese método. Rotar ambos tokens al refrescar. |

**Referencia:** `auth.service.ts` 214; `token.service.ts` 30–41 vs 59–83.

---

### AUTH-008 — Doble pipeline de autenticación (auth + Passport)

| Campo | Detalle |
|-------|---------|
| **Severity** | **High** |
| **Description** | Rutas protegidas encadenan `auth` (middleware custom: setea `req.id`) y `requireAuth` (Passport: setea `req.user`). Comportamientos distintos ante token expirado (auto-refresh 200 vs 401 de Passport). |
| **Impact** | Superficie de bugs, rutas con identidad incompleta (`req.id` sin `req.user`), respuestas inconsistentes, dificultad para auditar un solo flujo OWASP. |
| **Recommended Fix** | Unificar en un middleware: verificar access → opcional refresh → cargar usuario por tenant → poblar `req.user`. Deprecar duplicidad `req.id` / `req.user`. |

**Referencia:** `auth.ts` 66–67; `users.ts` 24–25.

---

### AUTH-009 — Middleware `auth` interrumpe la petición con refresh automático (200)

| Campo | Detalle |
|-------|---------|
| **Severity** | **High** |
| **Description** | Si falla la verificación del access token (y no es `/refresh-token`), `auth.middleware` intenta `refreshTokens` y responde **HTTP 200** con `newToken` sin invocar `next()`. |
| **Impact** | El cliente recibe éxito en lugar del recurso solicitado; las rutas que dependen de `auth` + handler nunca ejecutan la lógica de negocio. Comportamiento no estándar y propenso a errores de integración frontend. |
| **Recommended Fix** | Usar refresh solo en `POST /refresh-token`. En rutas API devolver `401` con `WWW-Authenticate` o código `TOKEN_EXPIRED`; el cliente debe llamar refresh explícitamente. |

**Referencia:** `auth.middleware.ts` líneas 31–40.

---

### AUTH-010 — Resolución de tenant falla abierto (`origin.checkDomain`)

| Campo | Detalle |
|-------|---------|
| **Severity** | **High** |
| **Description** | Si falla la extracción del subdominio, `checkDomain` captura el error, deja `clientAccount = undefined` y llama `next()`. |
| **Impact** | Rutas que asumen tenant pueden ejecutarse sin aislamiento o fallar de forma inconsistente; riesgo de operaciones sin contexto tenant en auth/registro. |
| **Recommended Fix** | Fail-closed: responder `400/403` con mensaje genérico si no hay tenant válido. Validar tenant contra registro en `Settings` antes de auth sensible. |

**Referencia:** `origin.ts` líneas 44–47.

---

### AUTH-011 — Login sin `checkTenant` en cadena de middlewares

| Campo | Detalle |
|-------|---------|
| **Severity** | **High** |
| **Description** | La ruta `POST /login` tiene `checkDomain` pero `origin.checkTenant` está comentado. |
| **Impact** | Login depende solo del header `Origin`; sin validación adicional de existencia/provisión del tenant (Redis/cache no valida tenant en DB). |
| **Recommended Fix** | Restaurar `checkTenant` y validar que existan `Settings` para `clientAccount` antes de autenticar. |

**Referencia:** `auth.ts` líneas 40–48.

---

### AUTH-012 — Registro emite sesión JWT antes de verificar email

| Campo | Detalle |
|-------|---------|
| **Severity** | **High** |
| **Description** | `registerUser` crea usuario con `verified: false` pero devuelve `session: Bearer ${token}` igual que un login exitoso. |
| **Impact** | Usuario no verificado puede acceder a APIs si los middlewares no exigen `verified: true` globalmente (Passport no lo comprueba). |
| **Recommended Fix** | No emitir token hasta verificación, o emitir token de alcance limitado (`scope: 'verify-only'`) excluido por middleware. Añadir check `user.verified` en estrategia JWT. |

**Referencia:** `auth.service.ts` líneas 81–114.

---

### AUTH-013 — Enumeración de usuarios en forgot-password

| Campo | Detalle |
|-------|---------|
| **Severity** | **High** |
| **Description** | Si el email no existe en el tenant, `forgotPassword` lanza `User not found` (404). |
| **Impact** | OWASP A07 — atacante puede enumerar emails registrados por tenant. |
| **Recommended Fix** | Respuesta uniforme `200` con mensaje genérico (“Si el email existe, recibirás instrucciones”) independientemente de existencia; mismo tiempo de respuesta (timing-safe delay opcional). |

**Referencia:** `auth.service.ts` líneas 237–243.

---

### AUTH-014 — Sin revocación de sesión / rotación con blacklist

| Campo | Detalle |
|-------|---------|
| **Severity** | **High** |
| **Description** | JWT stateless sin `jti`, sin store de revocación, sin invalidación al cambiar contraseña o logout. `refreshTokens` emite nuevos tokens sin invalidar los anteriores. |
| **Impact** | Tokens robados siguen válidos hasta expiración; refresh theft permite sesiones paralelas indefinidas. |
| **Recommended Fix** | Almacenar refresh tokens (hash) en DB/Redis por usuario+tenant; rotación con detección de reuse; invalidar familia de tokens en `resetPassword` y logout. |

**Referencia:** `token.service.ts` 59–83; `auth.service.ts` 392–397.

---

### AUTH-015 — Cifrado AES-256-CBC sin autenticación (no AEAD)

| Campo | Detalle |
|-------|---------|
| **Severity** | **High** |
| **Description** | Los JWT se envuelven con `aes-256-cbc` (confidencialidad sin integridad autenticada). |
| **Impact** | Riesgo de manipulación ciphertext (padding oracle clásico en CBC mal usado); complejidad innecesaria frente a HTTPS + JWT firmados. |
| **Recommended Fix** | Preferir JWT firmados directamente en Authorization (HTTPS obligatorio). Si se requiere envelope encryption, usar **AES-256-GCM** o eliminar capa y confiar en TLS. |

**Referencia:** `crypto.ts` líneas 4–21.

---

### AUTH-016 — `JWT_EXPIRATION_IN_MINUTES` sin sufijo de unidad

| Campo | Detalle |
|-------|---------|
| **Severity** | **Medium** |
| **Description** | `expiresIn` recibe el string `'90'` desde env (nombre implica minutos, valor sin `m`/`min`). |
| **Impact** | `jsonwebtoken` puede interpretar `'90'` como 90 segundos u otra unidad según versión — ventana de sesión mucho más corta o errónea de lo planificado. |
| **Recommended Fix** | Normalizar en config: `expiresIn: `${minutes}m`` o número en segundos calculado explícitamente. Documentar en `.env.example`. |

**Referencia:** `token.service.ts` 15, 49; `env.config.ts` 21.

---

### AUTH-017 — Política de contraseña inconsistente (registro/login vs reset)

| Campo | Detalle |
|-------|---------|
| **Severity** | **Medium** |
| **Description** | `password()` validator: mínimo 5 caracteres en register/login (`validate: false`); `PasswordValidator` (8+ mayúscula, número, especial) solo en reset cuando `validate: true`. |
| **Impact** | Contraseñas débiles en cuentas nuevas; incumplimiento de políticas corporativas y OWASP A07. |
| **Recommended Fix** | Aplicar `PasswordValidator.validate` en register, login (cambio), reset y perfil de forma uniforme. |

**Referencia:** `checkFieldTovalidate.ts` 34–51; `password.validator.ts`.

---

### AUTH-018 — Email único global en esquema User (multi-tenant)

| Campo | Detalle |
|-------|---------|
| **Severity** | **Medium** |
| **Description** | Campo `email` tiene `unique: true` a nivel de colección, no compuesto con tenant. |
| **Impact** | Un mismo email no puede registrarse en dos tenants; o fuerza identidad global no documentada. Conflicto con modelo SaaS multi-tenant típico. |
| **Recommended Fix** | Índice compuesto único `{ tenantId: 1, email: 1 }` (según plugin mongo-tenant). Eliminar unique global en email. |

**Referencia:** `User.ts` líneas 56–60.

---

### AUTH-019 — Rol por defecto `admin` en nuevo usuario

| Campo | Detalle |
|-------|---------|
| **Severity** | **Medium** |
| **Description** | Schema User define `role` default `'admin'`. Registro no asigna rol explícito. |
| **Impact** | Primer usuario de un tenant nuevo recibe privilegios máximos sin flujo de provisión controlada. |
| **Recommended Fix** | Default `organizer` o `viewer`; asignar `admin` solo en seed/provisión explícita. Separar “tenant owner” de rol aplicación. |

**Referencia:** `User.ts` líneas 67–70.

---

### AUTH-020 — Logs sensibles en AuthService (login) y roleAuthorization

| Campo | Detalle |
|-------|---------|
| **Severity** | **Medium** |
| **Description** | Login registra resultado de comparación de contraseña y longitudes. `roleAuthorization` registra `req.user` completo en nivel `info`. |
| **Impact** | Fuga de metadatos de autenticación y PII en logs; facilita inferencia de cuentas. |
| **Recommended Fix** | Loguear solo eventos de seguridad anonimizados (fallo/éxito sin detalles). Nunca loguear objeto usuario completo. |

**Referencia:** `auth.service.ts` 337–341; `roleAuthorization.middleware.ts` 12.

---

### AUTH-021 — Verificación de email vía GET con UUID en URL

| Campo | Detalle |
|-------|---------|
| **Severity** | **Medium** |
| **Description** | `POST /verify/:tenant/:verificationCode` expone código en path; puede quedar en logs de proxy, historial y Referer. |
| **Impact** | Secuestro de verificación si el enlace se filtra; OWASP — transporte de secretos en URL. |
| **Recommended Fix** | `POST` con body `{ code }` de un solo uso, TTL corto, invalidar tras uso (ya se limpia `verification`). |

**Referencia:** `authRoutes.ts`; `auth.service.ts` verifyUser.

---

### AUTH-022 — Token de reset password (urlId) reutilizable y extensible

| Campo | Detalle |
|-------|---------|
| **Severity** | **Medium** |
| **Description** | Si ya existe token no usado, se extiende `expiresAt` y se reenvía el mismo `urlId` (UUID). |
| **Impact** | Enlace antiguo en bandeja de entrada sigue válido tras re-solicitud; múltiples vectores activos para la misma cuenta. |
| **Recommended Fix** | Invalidar tokens previos al crear uno nuevo; un solo token activo por email; opcionalmente hash del urlId en DB. |

**Referencia:** `auth.service.ts` 255–277.

---

### AUTH-023 — Desalineación validación reset: body vs query

| Campo | Detalle |
|-------|---------|
| **Severity** | **Medium** |
| **Description** | Validator exige `urlId` en body; controller lee `req.query.urlId`. |
| **Impact** | Bypass de validación express-validator si el cliente envía urlId solo en query; comportamiento impredecible. |
| **Recommended Fix** | Una sola fuente (body o query) alineada en validator y controller. |

**Referencia:** `auth.controller.ts` 170; `auth.validator.ts` 31–34.

---

### AUTH-024 — `refreshToken` controller no envía respuesta en catch

| Campo | Detalle |
|-------|---------|
| **Severity** | **Medium** |
| **Description** | En `AuthController.refreshToken`, el bloque `catch` llama `ApiResponse.error(...)` sin `res.status().json()`. |
| **Impact** | Cliente colgado hasta timeout; posible fuga de handles; mala experiencia y logs de proxy. |
| **Recommended Fix** | Patrón idéntico a otros métodos: `res.status(...).json(ApiResponse.error(...))`. |

**Referencia:** `auth.controller.ts` 137–140.

---

### AUTH-025 — Import `authenticateToken` inexistente en rutas championship

| Campo | Detalle |
|-------|---------|
| **Severity** | **Medium** |
| **Description** | Varias rutas importan `authenticateToken` desde `auth.middleware.ts`, pero el archivo solo exporta `auth`. |
| **Impact** | Fallo de build/runtime en módulos championship; rutas potencialmente sin protección si existe alias elsewhere. |
| **Recommended Fix** | Exportar alias explícito o unificar nombre; verificar compilación y tests de rutas protegidas. |

**Referencia:** `match.routes.ts` y rutas championship similares.

---

### AUTH-026 — Código muerto de doble hash en User model

| Campo | Detalle |
|-------|---------|
| **Severity** | **Medium** |
| **Description** | `Hash`/`GenSalt` definidos en `User.ts` pero no hay hook `pre('save')` que los use. |
| **Impact** | Otros flujos que hagan `user.password = plain` + `save()` persistirían contraseña en claro. Hoy AuthService usa `PasswordUtil` correctamente. |
| **Recommended Fix** | Eliminar código muerto o añadir `pre('save')` que hashee solo si el password cambió y no está ya hasheado (detectar prefijo bcrypt `$2`). |

**Referencia:** `User.ts` 107–124.

---

### AUTH-027 — `verifyResetToken` en TokenService no usado en flujo reset

| Campo | Detalle |
|-------|---------|
| **Severity** | **Low** |
| **Description** | Existe método JWT `verifyResetToken` pero reset usa `urlId` UUID en colección ForgotPassword. |
| **Impact** | Código confuso; riesgo de uso incorrecto futuro mezclando dos mecanismos. |
| **Recommended Fix** | Eliminar método obsoleto o documentar un solo mecanismo de reset. |

**Referencia:** `token.service.ts` 100–107.

---

### AUTH-028 — Salt fijo en derivación de clave crypto

| Campo | Detalle |
|-------|---------|
| **Severity** | **Low** |
| **Description** | `crypto.scryptSync(env.CRYPTO_SECRET, 'salt', 32)` usa salt estático `'salt'`. |
| **Impact** | Debilita defensa en profundidad si `CRYPTO_SECRET` se filtra parcialmente; todos los deployments derivan igual. |
| **Recommended Fix** | Usar salt aleatorio por entorno almacenado en env, o KMS. Para envelope JWT, evaluar eliminar capa. |

**Referencia:** `crypto.ts` línea 5.

---

### AUTH-029 — CORS abierto sin restricción documentada

| Campo | Detalle |
|-------|---------|
| **Severity** | **Low** |
| **Description** | `Server` usa `cors()` sin opciones (permite cualquier origin en muchas configuraciones). |
| **Impact** | Combinado con auth basada en `Origin`, aumenta superficie CSRF/credenciales en browsers mal configurados. |
| **Recommended Fix** | Whitelist de origins por tenant/entorno; `credentials` solo donde aplique. |

**Referencia:** `server.ts` línea 42.

---

### AUTH-030 — Auth social (Facebook) preparado con cookie tenant larga

| Campo | Detalle |
|-------|---------|
| **Severity** | **Low** |
| **Description** | `FacebookService` setea cookie `tenant` con `expires: Date.now() + 9999` (~1970 bug: usa ms desde epoch incorrectamente en `expires` — en Express `expires` espera Date object; `9999` ms es ~10 segundos actually wait - `new Date(Date.now() + 9999)` is 9.999 seconds from now, not years). |
| **Impact** | Rutas sociales comentadas; si se activan sin revisión, cookies y OAuth state deben alinearse con tenant binding. |
| **Recommended Fix** | Antes de producción: `state` OAuth con tenant, PKCE, callback HTTPS, validar token Facebook server-side. |

**Referencia:** `facebook.service.ts` 14–26.

---

### AUTH-031 — Mensajes de error de auth revelan estado (español/inglés mixto)

| Campo | Detalle |
|-------|---------|
| **Severity** | **Low** |
| **Description** | Mensajes distintos para “no verificado”, “bloqueado”, “credenciales inválidas” facilitan perfilado. |
| **Impact** | Enumeración de estado de cuenta (menor que email enumeration). |
| **Recommended Fix** | Mensaje genérico en login; códigos internos en logs solamente. |

**Referencia:** `auth.service.ts` login flow.

---

### AUTH-032 — Sin rate limiting en endpoints auth

| Campo | Detalle |
|-------|---------|
| **Severity** | **Low** |
| **Description** | No hay throttling en login, register, forgot-password, verify. |
| **Impact** | Brute force distribuido a pesar de `loginAttempts` por usuario (register/forgot sin límite por IP). |
| **Recommended Fix** | Rate limit por IP + tenant (express-rate-limit / API gateway). |

---

### AUTH-033 — Bloqueo por intentos: ventana no se resetea antes de umbral en primer bloqueo

| Campo | Detalle |
|-------|---------|
| **Severity** | **Low** |
| **Description** | `checkLoginAttemptsAndBlockExpires` bloquea cuando `loginAttempts >= MAX` sin reset incremental claro en el primer cruce (lógica funciona pero `blockExpires` default `Date.now` puede confundir comparaciones). |
| **Impact** | Edge cases de usuarios migrados con campos corruptos. |
| **Recommended Fix** | Tests unitarios de lockout; normalizar `blockExpires` null cuando no bloqueado. |

**Referencia:** `auth.service.ts` 443–469.

---

### AUTH-034 — Registro crea tenant: validación solo “settings no existe”

| Campo | Detalle |
|-------|---------|
| **Severity** | **Medium** |
| **Description** | `registerUser` rechaza si el tenant ya tiene Settings; si no, crea usuario + settings + plugins. El tenant viene de subdominio Origin sin prueba de propiedad del dominio. |
| **Impact** | Cualquiera que adivine/fuerce un subdominio nuevo puede provisionar tenant y obtener JWT admin por defecto. |
| **Recommended Fix** | Flujo de onboarding separado; verificación de dominio; invitación; CAPTCHA; no emitir admin por defecto. |

**Referencia:** `auth.service.ts` 65–102.

---

## OWASP Top 10 Mapping (resumen)

| OWASP | Hallazgos relacionados |
|-------|------------------------|
| A01 Broken Access Control | AUTH-005, AUTH-006, AUTH-010, AUTH-011, AUTH-012, AUTH-019 |
| A02 Cryptographic Failures | AUTH-001, AUTH-002, AUTH-003, AUTH-004, AUTH-015, AUTH-016, AUTH-028 |
| A04 Insecure Design | AUTH-007, AUTH-008, AUTH-009, AUTH-014, AUTH-034 |
| A05 Security Misconfiguration | AUTH-010, AUTH-011, AUTH-029, AUTH-004, AUTH-016 |
| A07 Identification & Auth Failures | AUTH-012, AUTH-013, AUTH-017, AUTH-031, AUTH-032, AUTH-033 |
| A09 Security Logging Failures | AUTH-001, AUTH-002, AUTH-003, AUTH-020 |

---

## Session Management Assessment

| Aspecto | Estado actual | Riesgo |
|---------|---------------|--------|
| Tipo de sesión | Stateless JWT (access + refresh en blob cifrado) | Sin revocación server-side |
| Almacenamiento servidor | No hay sesiones en Redis/DB | Robo de token = acceso hasta expiry |
| Refresh | Parcial (`refreshTokens` en middleware; endpoint usa access) | Implementación inconsistente |
| Logout | No implementado en módulo auth | Tokens válidos post-logout |
| Binding tenant | Solo vía `Origin` header | Spoofing / misconfiguration |
| Passport sessions | `session: false` (correcto para API) | N/A |

---

## Password Storage Assessment

| Aspecto | Evaluación |
|---------|------------|
| Algoritmo | bcrypt vía `PasswordUtil` / bcryptjs — **aceptable** |
| Salt rounds | `AUTH_CONSTANTS.SALT_ROUNDS = 10` — **aceptable** (considerar 12 en producción) |
| Rutas de hash | AuthService usa `PasswordUtil` en register/reset — **correcto** |
| Model hooks | No activos — **riesgo** si otros servicios escriben password directo |
| Logging | Longitudes y match en login — **inaceptable** |
| Política complejidad | Débil en register — **mejorar** |

---

## Multi-Tenant Risks (auth-specific)

1. Tenant derivado de `Origin` sin vincular JWT (AUTH-005, AUTH-006, AUTH-010).  
2. Login sin `checkTenant` (AUTH-011).  
3. Email global unique (AUTH-018).  
4. Auto-provisioning de tenant en register (AUTH-034).  
5. Passport carga usuario cross-tenant (AUTH-005).

---

## Missing Validations (consolidado)

- [ ] `user.verified === true` en estrategia JWT global  
- [ ] `tenant` claim en JWT y validación vs `clientAccount`  
- [ ] Política de contraseña fuerte en register/login  
- [ ] Rate limiting IP en auth endpoints  
- [ ] Respuesta uniforme forgot-password  
- [ ] Revocación de tokens en password reset  
- [ ] Validación de existencia de tenant en DB antes de login  
- [ ] Alineación urlId body/query en reset  
- [ ] Export unificado de middleware de autenticación en todas las rutas  
- [ ] Variable de entorno dedicada para refresh TTL  
- [ ] Redacción de campos sensibles en logging global  

---

## Prioritized Remediation Roadmap

### P0 (inmediato — antes de producción)
1. Eliminar logging de tokens, contraseñas y body sin redacción (AUTH-001, 002, 003, 020).  
2. Corregir `JWT_REFRESH_EXPIRATION` vs uso de secret como TTL (AUTH-004).  
3. Fail-closed en `checkDomain` (AUTH-010).  
4. Vincular usuario a tenant en Passport + claim tenant en JWT (AUTH-005, 006).

### P1 (1–2 sprints)
5. Unificar pipeline auth; arreglar refresh semantics (AUTH-007, 008, 009).  
6. No emitir JWT en register sin verificar; check verified en JWT (AUTH-012).  
7. Forgot-password anti-enumeration (AUTH-013).  
8. Refresh token rotation + invalidación en reset (AUTH-014).  
9. Política de contraseña uniforme (AUTH-017).

### P2 (hardening)
10. Eliminar o sustituir AES-CBC envelope (AUTH-015).  
11. Índice email por tenant (AUTH-018).  
12. Rate limiting, CORS whitelist, onboarding tenant (AUTH-029, 032, 034).  

---

## Conclusion

El módulo tiene bases razonables (bcrypt, JWT firmados, intentos de login, verificación de email, validadores express), pero **no está listo para producción** mientras persistan el **logging de tokens y contraseñas**, la **configuración rota del refresh TTL**, y el **desacople tenant-usuario en Passport**. La prioridad absoluta es P0 de logging y corrección de tokens; en paralelo, unificar autenticación y cerrar el modelo multi-tenant en el payload JWT y en la carga de usuario.

---

*Documento generado por auditoría estática. No sustituye pentest ni revisión de dependencias (SCA).*
