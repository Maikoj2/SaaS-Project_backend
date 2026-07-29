# Frontend / Backend Mapping V1

Este documento relaciona superficies del frontend con el contrato HTTP real.
Los paths son completos desde `/api/v1`.

## Championship detail

### InvitationLink / Public Registration Link

#### Public Registration Link Card

Base real:

```text
/api/v1/invitationLink
```

Todas las llamadas requieren un `Origin` válido para resolver el tenant. Las
administrativas requieren JWT y permiso; el uso del enlace es público.

| Acción | Endpoint real | Request | Response consumida | Auth / permiso | Comportamiento de UI |
|---|---|---|---|---|---|
| Generar link | `POST /api/v1/invitationLink/championships/:championshipId/invitation-link` | Params: `championshipId`. Body: `{ maxUses, expiresAt }` | Objeto directo `{ invitationLink, expiresAt, code }` | Sí / `invitation-link:create` | Mostrar y conservar `invitationLink`; pasar la tarjeta a activo |
| Obtener link activo | `GET /api/v1/invitationLink/championships/:championshipId/invitation-link` | Params: `championshipId` | Documento directo con `code`, `expiresAt`, `isActive`, `maxUses`, `usedCount`; ausencia prevista: `404` | Sí / `invitation-link:read` | Documento presente: mostrar activo; `404`: estado vacío/generable |
| Copiar link | Sin endpoint | Acción local sobre `invitationLink` | No aplica | No aplica | Copiar al portapapeles; no llamar a `USE_LINK` |
| Abrir formulario público | Navegar a la URL de `invitationLink`; al consumir el código, `POST /api/v1/invitationLink/championships/invitation/use` | Body de uso: `{ code }` | `{ success: true, data: { championshipId, maxUses, usedCount, expiresAt }, message }` | Sin JWT/permiso; requiere Origin/tenant | Continuar al flujo público si es válido; mostrar error si expiró, se agotó o está inactivo |
| Ver stats | `GET /api/v1/invitationLink/championships/:championshipId/invitation-link/stats` | Params: `championshipId` | `{ usedCount, maxUses, remainingUses, expiresAt, isActive, code }`; ausencia actual: `null` | Sí / `invitation-link:read` | Mostrar usos/restantes/expiración; tratar `null` como no disponible |
| Desactivar link | `DELETE /api/v1/invitationLink/championships/:championshipId/invitation-link` | Params: `championshipId`; sin body | `{ success: true, data: "Invitation link deactivated successfully" }` | Sí / `invitation-link:manage` | Refrescar active/stats; confirmar con lectura antes de marcar inactivo mientras exista el defecto backend |

#### Estado recomendado de la tarjeta

```text
loading | empty | active | expired | exhausted | inactive | error
```

| Condición | Estado UI |
|---|---|
| Lectura pendiente | `loading` |
| GET active `404` o stats `null` | `empty` |
| `isActive === false` | `inactive` |
| `expiresAt <= ahora` | `expired` |
| `usedCount >= maxUses` | `exhausted` |
| Activo, vigente y con usos | `active` |
| Error de red, auth o tenant | `error` |

Disponibilidad efectiva:

```text
isActive === true
expiresAt > ahora
usedCount < maxUses
```

#### Reglas de integración

- Generación, GET active, stats y listado devuelven objetos directos.
- Uso público y desactivación usan `{ success, data, message }`.
- La URL generada se llama `invitationLink`, no `url`.
- No existe `status`; combinar `isActive`, expiración y usos.
- Copiar y abrir son acciones locales, no endpoints.
- Abrir/copiar no debe incrementar `usedCount`; este cambia al llamar `USE_LINK`.

#### Incidencias backend conocidas

GET active, stats y deactivate declaran `:championshipId`, pero actualmente sus
controllers leen `req.params.id`. Hasta corregirlo:

- GET active puede responder `404` aunque exista el enlace;
- stats puede responder `200` con `null`;
- deactivate puede responder éxito sin actualizar.

El frontend no debe inventar una ruta con `:id`: debe conservar el path
documentado y manejar defensivamente esas respuestas.

#### Historial opcional

```http
GET /api/v1/invitationLink/championships/invitation-link/all
    ?page=1
    &limit=10
    &sortField=createdAt
    &sortOrder=desc
```

Requiere JWT y `invitation-link:read`. Devuelve paginación directa con `docs`;
cada item contiene los campos seleccionados del link y
`championshipId.name` poblado.
