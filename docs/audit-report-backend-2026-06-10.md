# Backend Audit Report - 2026-06-10

## Contexto

Proyecto auditado: multi-tenant SaaS para campeonatos de volleyball.

Stack: Node.js, Bun, Express, TypeScript, MongoDB y Mongoose.

Alcance aplicado: auditoria general del backend dentro de `src/api`, enfocada en seguridad, multi-tenancy, autorizacion, TypeScript correctness y readiness para produccion.

## Resumen Ejecutivo

Se aplicaron fixes minimos y seguros sin reescribir arquitectura ni cambiar intencionalmente el comportamiento publico de la API.

Los cambios se concentraron en dos areas:

- Corregir orden/missing middleware de tenant antes de autenticacion.
- Eliminar logs sensibles o debug logs que podian exponer tokens, passwords, datos personales, objetos de usuario o datos de negocio.

## Hallazgos Antes de Cambiar Codigo

### 1. Tenant middleware despues de auth en `/token`

Archivo: `src/api/routes/auth/auth.ts`

Problema:

La ruta `AuthRoute.TOKEN` ejecutaba `auth` antes de `origin.checkDomain` y `origin.checkTenant`. El middleware `auth` depende de `req.clientAccount`, por lo que podia fallar aunque el token fuera valido.

Riesgo:

- Fallo de autenticacion para usuarios validos.
- Comportamiento inconsistente en flujo multi-tenant.

Fix aplicado:

Se movieron `origin.checkDomain` y `origin.checkTenant` antes de `auth`.

### 2. Ruta profile stepper sin tenant middleware

Archivo: `src/api/routes/profile/profile.ts`

Problema:

La ruta `ProfileRoute.STEPPER` ejecutaba `auth` sin extraer ni validar tenant antes.

Riesgo:

- `auth` no puede resolver correctamente el usuario dentro del tenant.
- Guardia multi-tenant inconsistente respecto a otras rutas de profile.

Fix aplicado:

Se agregaron `origin.checkDomain` y `origin.checkTenant` antes de `auth`.

### 3. Request body completo en logs

Archivo: `src/api/models/server/server.ts`

Problema:

El middleware global de logging registraba `req.body`.

Riesgo:

- Exposicion de passwords.
- Exposicion de reset tokens.
- Exposicion de informacion personal o datos de pagos.
- Riesgo operacional en produccion por logs demasiado sensibles.

Fix aplicado:

Se removio `body: req.body` del log global.

### 4. Token de sesion en logs de login

Archivo: `src/api/controllers/auth/auth.controller.ts`

Problema:

El login registraba `result.session`, que contiene el bearer token.

Riesgo:

- Token leakage en logs.
- Posible takeover de cuenta si logs son accesibles.

Fix aplicado:

Se mantuvo el log de `userId`, pero se removio el token.

### 5. Password nuevo en logs de reset password

Archivo: `src/api/controllers/auth/auth.controller.ts`

Problema:

El reset password registraba `newPassword`.

Riesgo:

- Exposicion directa de credenciales en logs.

Fix aplicado:

Se removio `newPassword` del log.

### 6. Debug logs con datos sensibles o innecesarios

Archivos:

- `src/api/middlewares/auth.middleware.ts`
- `src/api/services/profile/profile.service.ts`
- `src/api/services/auth/auth.service.ts`
- `src/api/services/championship/register.service.ts`
- `src/api/services/plugin/plugin.service.ts`
- `src/api/models/mongoose/setting/setting.ts`
- `src/api/utils/dataProcessor.ts`
- `src/api/utils/database.helper.ts`

Problema:

Habia `console.log` directos en paths compartidos y sensibles.

Ejemplos:

- Objeto de usuario autenticado.
- Usuario con `+password` seleccionado durante cambio de password.
- Resultado de verificacion de usuario.
- Resultado paginado de base de datos.
- Invitation link.
- Lista de plugins activados.
- File path interno de template.
- Campos de direccion del usuario.

Riesgo:

- Data leakage en consola/logs.
- Logs no estructurados en produccion.
- Exposicion accidental de informacion multi-tenant.

Fix aplicado:

Se removieron los `console.log` directos detectados dentro de `src/api`.

### 7. Telemetria innecesaria de comparacion de password

Archivo: `src/api/services/auth/auth.service.ts`

Problema:

El login registraba resultado de comparacion y longitudes de password/hash.

Riesgo:

- Aunque no exponia el password plano, era telemetria innecesaria sobre autenticacion.

Fix aplicado:

Se removio el log de comparacion de password.

## Archivos Modificados

- `src/api/controllers/auth/auth.controller.ts`
- `src/api/middlewares/auth.middleware.ts`
- `src/api/models/mongoose/setting/setting.ts`
- `src/api/models/server/server.ts`
- `src/api/routes/auth/auth.ts`
- `src/api/routes/profile/profile.ts`
- `src/api/services/auth/auth.service.ts`
- `src/api/services/championship/register.service.ts`
- `src/api/services/plugin/plugin.service.ts`
- `src/api/services/profile/profile.service.ts`
- `src/api/utils/dataProcessor.ts`
- `src/api/utils/database.helper.ts`

## Verificacion

Comando solicitado:

```bash
bun tsc --noEmit
```

Resultado inicial:

PowerShell bloqueo el shim `bun.ps1` por politica de ejecucion del sistema.

Comando equivalente ejecutado:

```bash
bun.cmd tsc --noEmit
```

Resultado:

Paso correctamente.

Nota: la ejecucion con `bun.cmd` requirio aprobacion fuera del sandbox porque Node/Bun no podia resolver `C:\Users\User` dentro del sandbox.

## Riesgos Detectados Pero No Cambiados

Estos puntos quedan como recomendaciones porque corregirlos puede requerir decisiones de producto, configuracion de entorno o migraciones:

### 1. CORS abierto globalmente

Archivo: `src/api/models/server/server.ts`

Actualmente se usa `cors()` sin allowlist.

Recomendacion:

Definir dominios permitidos por entorno y validar origins de tenants conocidos.

### 2. Tenant derivado desde `Origin`

Archivo: `src/api/middlewares/auth/origin.ts`

Actualmente el tenant se infiere desde el subdominio del header `Origin`.

Recomendacion:

Mantener compatibilidad actual, pero agregar allowlist/verificacion de tenant-domain para evitar spoofing de origin en clientes no-browser o integraciones server-to-server.

### 3. Token wrapper usa AES-CBC sin autenticacion

Archivo: `src/api/utils/crypto.ts`

Actualmente se cifra con AES-256-CBC.

Recomendacion:

Planificar migracion a AES-GCM o usar JWT firmado sin wrapper cifrado, segun decision de seguridad del producto. Esto puede cambiar formato de token y requiere cuidado con sesiones existentes.

### 4. Queries no tenant-bound en algunos model methods

Algunos metodos de modelos usan queries Mongoose directas internamente.

Recomendacion:

Auditar cada call path antes de cambiar, porque podria afectar comportamiento actual. Donde aplique, preferir `Model.byTenant(tenant)`.

## Commit Message Sugerido

```text
fix: harden tenant auth flow and remove sensitive logs
```

