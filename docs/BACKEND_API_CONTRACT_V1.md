# Backend API Contract V1

Contrato generado a partir de las rutas, validadores, controladores y servicios
reales del repositorio. No incluye endpoints proyectados o constantes que no estén
montadas en un `Router`.

## Convenciones

- Prefijo global: `/api/v1`.
- Todas las rutas, salvo el webhook de pagos, pasan por la resolución de tenant.
- `Auth: sí` significa que la ruta usa el middleware `auth`.
- Cuando existe permiso, además de autenticación se exige el valor indicado.
- La mayoría de respuestas usan `ApiResponse`:

```json
{
  "success": true,
  "data": {}
}
```

- Los listados que usan `DatabaseHelper.getItemsWithRelations` devuelven una
  estructura paginada con `docs`, `totalDocs`, `limit`, `totalPages`, `page`,
  `hasPrevPage` y `hasNextPage`.
- Estados canónicos de Championship usados actualmente por el service:
  `draft`, `registration`, `in_progress`, `completed`, `cancelled`.
- IDs indicados como `ObjectId` deben ser MongoDB ObjectId válidos.
- `—` en la columna de estado significa que el código no aplica una restricción
  explícita por estado del campeonato.

## Auth

Base real: `/api/v1/auth`

| Método | Path real | Params / body | Respuesta resumida | Auth / permiso | Estado |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/verify/:tenant/:verificationCode` | Path: `tenant`, `verificationCode` | Usuario verificado | No | — |
| POST | `/api/v1/auth/register` | Body: `name`, `email`, `password`; opcional `userReferred` | `201`, usuario registrado | No | — |
| POST | `/api/v1/auth/login` | Body: `email`, `password` | Usuario y tokens de sesión | No | — |
| GET | `/api/v1/auth/check` | Sin params ni body | `{ exists: boolean }` para el tenant resuelto | No | — |
| GET | `/api/v1/auth/token` | Sin params ni body | Token actualizado | Sí / `PROFILE_READ` | — |
| POST | `/api/v1/auth/forgot-password` | Body: `email` | Confirmación de envío del correo de recuperación | No | — |
| POST | `/api/v1/auth/reset-password` | Body: `urlId`, `newPassword` | Confirmación de cambio de contraseña | No | — |
| POST | `/api/v1/auth/change-temporary-password` | Body: `currentPassword`, `newPassword` | `{ user, message }` | Sí / sin permiso adicional | — |
| POST | `/api/v1/auth/refresh-token` | El controller delega la obtención del refresh token al service; no hay validador de body | Token actualizado | No | — |

## Championship

Base real: `/api/v1/championship`

| Método | Path real | Params / query / body | Respuesta resumida | Auth / permiso | Estado requerido |
|---|---|---|---|---|---|
| POST | `/api/v1/championship/` | Body requerido: `name`, `startDate`, `endDate`, `maxTeams`, `registrationDeadline`, `registrationFee`, `competitionRulePreset`. Opcionales: `description`, `gameFormatId`, `tieBreakerCriteria`, `customRules`, `matchDurationLimit`, `setDurationLimit`, `logo`, `banner` | `201`, objeto directo `{ championship, configuration }` (esta ruta no usa el envelope usual) | Sí / `CHAMPIONSHIP_CREATE` | Crea en `draft` y el flujo lo mueve a `registration` |
| GET | `/api/v1/championship/` | Query opcional: `status`, `search`, `page` (default 1), `limit` (default 20), `sort` (`1` o `-1`) | Listado paginado de championships no eliminados | Sí / `CHAMPIONSHIP_READ` | — |
| GET | `/api/v1/championship/active` | Sin params ni body | Listado paginado con estados `registration`, `in_progress` o `active`, excluyendo eliminados | Sí / `CHAMPIONSHIP_READ` | — |
| GET | `/api/v1/championship/:id` | Path: `id` | Championship con su configuración | Sí / `CHAMPIONSHIP_READ` | — |
| PATCH | `/api/v1/championship/` | El validador espera body `id`, `status`, pero el controller lee `req.params.id` y la ruta no contiene `:id` | Pretende devolver el championship actualizado | Sí / `CHAMPIONSHIP_UPDATE` | Transiciones: `draft → registration/cancelled`; `registration → in_progress/cancelled`; `in_progress → completed/cancelled` |
| POST | `/api/v1/championship/:id/teams` | La ruta aporta `id`; validador y controller esperan `championshipId`, y el controller espera además `teamId` en params | Pretende devolver el championship con el equipo registrado | Sí / `CHAMPIONSHIP_REGISTER_TEAM` | `registration` |
| DELETE | `/api/v1/championship/:championshipId` | Path: `championshipId`. Body: `deleteReason` string de 3 a 500 caracteres | Championship marcado `deleted`, con `deletedAt`, `deletedBy`, `deleteReason` y estado `cancelled` | Sí / `CHAMPIONSHIP_DELETE` | Solo `draft`, `registration` o `cancelled`; rechaza `in_progress` y `completed` |

### Advertencias de integración de Championship

- `PATCH /api/v1/championship/` está declarado, pero actualmente no puede
  entregar `req.params.id` al controller.
- `POST /api/v1/championship/:id/teams` tiene nombres y ubicación de parámetros
  incompatibles entre route, validator y controller. No debe considerarse
  operativo para Frontend V1 hasta corregir ese contrato.

## ChampionshipConfiguration

Estas rutas están montadas dentro del router singular `championship`.

| Método | Path real declarado | Params / body | Respuesta resumida | Auth / permiso | Estado requerido |
|---|---|---|---|---|---|
| GET | `/api/v1/championship/championship/:championshipId/configuration/:configurationId` | Path declarado: `championshipId`, `configurationId` | Pretende devolver la configuración | Sí / `CHAMPIONSHIP_READ` | — |
| PATCH | `/api/v1/championship/championship/:championshipId/configuration/:configurationId` | Path declarado: `championshipId`, `configurationId`. Body parcial: `maxTeams`, `courts`, `competitionType`, `gameFormatId`, `distributionStrategy`, `tieBreakerCriteria.{setRatio,pointRatio,draw}`, `matchRules.{volleyballType,setsToWin,maxSets,regularSetPoints,tieBreakPoints,minimumPointDifference}`, `tablePointsPolicy.{winPoints,lossPoints,walkoverLossPoints,walkoverWinPoints}`, `tournamentBracket`, `customRules`, `matchDurationLimit`, `setDurationLimit`, `registrationDeadline`, `registrationFee` | Pretende devolver la configuración actualizada | Sí / `CHAMPIONSHIP_UPDATE` | — |

Advertencia: ambos controllers leen `req.params.idConfiguration`, pero la ruta
declara `:configurationId`. En el estado actual estas dos operaciones no reciben
el ID que espera el service.

## Court

Base real: `/api/v1/court`

Tipos aceptados: `indoor`, `beach`. Estados aceptados: `available`, `reserved`,
`occupied`, `maintenance`.

| Método | Path real | Params / query / body | Respuesta resumida | Auth / permiso | Estado requerido |
|---|---|---|---|---|---|
| POST | `/api/v1/court/create-court` | Body: `name`, `type`, `capacity`; opcionales `status`, `location`, `dimensions`, `surface`, `amenities: string[]` | `201`, court creado | Sí / `COURT_CREATE` | — |
| GET | `/api/v1/court/get-courts` | Query opcional: `status`, `type`, `currentChampionshipId`, `page`, `limit` | Courts paginados | Sí / `COURT_READ` | — |
| GET | `/api/v1/court/get-available-courts` | Query opcional: `page`, `limit` | Courts disponibles paginados | Sí / `COURT_READ` | — |
| GET | `/api/v1/court/get-court-by-id/:courtId` | Path: `courtId` | Court | Sí / `COURT_READ` | — |
| PATCH | `/api/v1/court/update-court/:courtId` | Path: `courtId`. Body parcial con los campos de creación | Court actualizado | Sí / `COURT_UPDATE` | — |
| DELETE | `/api/v1/court/delete-court/:courtId` | Path: `courtId` | Confirmación/court eliminado físicamente según el service actual | Sí / `COURT_DELETE` | — |
| POST | `/api/v1/court/attach-courts-to-championship/:championshipId` | Path: `championshipId`. Body: `{ courtIds: ObjectId[] }` | Championship/courts vinculados | Sí / `COURT_UPDATE` | — |
| PATCH | `/api/v1/court/detach-courts-from-championship/:championshipId` | Path: `championshipId`. Body: `{ courtIds: ObjectId[] }` | Courts desvinculados | Sí / `COURT_UPDATE` | — |
| PATCH | `/api/v1/court/mark-court-as-occupied/:courtId` | Path: `courtId`; sin body validado | Court en `occupied` | Sí / `COURT_UPDATE` | — |
| PATCH | `/api/v1/court/mark-court-as-reserved/:courtId` | Path: `courtId`; sin body validado | Court en `reserved` | Sí / `COURT_UPDATE` | — |

## GameFormat

Base real y sensible a mayúsculas: `/api/v1/gameFormat`

`formatType`: `single_set`, `best_of_3`, `best_of_2`, `custom`.

| Método | Path real | Params / query / body | Respuesta resumida | Auth / permiso | Estado requerido |
|---|---|---|---|---|---|
| POST | `/api/v1/gameFormat/create` | Body: `formatType`, `sets`, `pointsPerSet`, `minAdvantage`; opcionales `description`, `tiebreakerPoints`, `maxPointsPerSet`, `customRules` | `201`, GameFormat creado | Sí / `GAME_FORMAT_CREATE` | — |
| GET | `/api/v1/gameFormat/get` | Query opcional: `formatType`, `page`, `limit` | GameFormats paginados | Sí / `GAME_FORMAT_READ` | — |
| GET | `/api/v1/gameFormat/:gameFormatId` | Path: `gameFormatId` | GameFormat | Sí / `GAME_FORMAT_READ` | — |
| PATCH | `/api/v1/gameFormat/update/:gameFormatId` | Path: `gameFormatId`. Body parcial: `description`, `sets`, `pointsPerSet`, `tiebreakerPoints`, `maxPointsPerSet`, `minAdvantage`, `customRules` | GameFormat actualizado | Sí / `GAME_FORMAT_UPDATE` | Sin guard directo de Championship; rechaza cambios si el formato ya está usado por matches relevantes |
| DELETE | `/api/v1/gameFormat/delete/:gameFormatId` | Path: `gameFormatId` | Confirmación de eliminación | Sí / `GAME_FORMAT_DELETE` | Rechaza si está usado por matches `scheduled`, `in_progress` o `completed` |
| PATCH | `/api/v1/gameFormat/championship/:championshipId/assign` | Path: `championshipId`. Body: `{ gameFormatId }` | Configuración del campeonato actualizada | Sí / `GAME_FORMAT_UPDATE` | Rechaza si el campeonato ya tiene matches `scheduled`, `in_progress` o `completed` |

## Team

Base real: `/api/v1/teams`

| Método | Path real | Params / query / body | Respuesta resumida | Auth / permiso | Estado requerido |
|---|---|---|---|---|---|
| POST | `/api/v1/teams/linkInvitation/:code` | Path: `code`. Body: `name`; opcionales `logo`, `players: ObjectId[]`, `clubId`, `status` | Team creado | Sí / sin permiso adicional | No valida estado; exige invitación vigente y deadline de registro no vencido |
| GET | `/api/v1/teams/championships/:championshipId/teams` | Path: `championshipId`. Query opcional: `status` (`active`/`inactive`), `search`, `page`, `limit` | Teams paginados | Sí / `TEAM_READ` | — |
| GET | `/api/v1/teams/championships/:championshipId/teams/:teamId` | Path: `championshipId`, `teamId` | Team | Sí / `TEAM_READ` | — |
| POST | `/api/v1/teams/championships/:championshipId/teams` | Path: `championshipId`. Body: `name`, `players: ObjectId[]`; opcionales `logo`, `captainId`, `categoryId`, `registrationStatus`, `clubId`, `feePaid` | `201`, `{ team, registration }` | Sí / `TEAM_CREATE` | No hay guard explícito de estado; aplica cupo y reglas de la configuración |
| PATCH | `/api/v1/teams/championships/:championshipId/teams/:teamId` | Path: `championshipId`, `teamId`. Body parcial permitido: `name`, `logo`, `categoryId`, `captainId`, `players`, `status` | Team actualizado | Sí / `TEAM_UPDATE` | Rechaza si ya existen matches `scheduled`, `in_progress` o `completed` |
| POST | `/api/v1/teams/championships/:championshipId/teams/:teamId/players` | Body: `{ playerId }` | Team con jugador agregado | Sí / `TEAM_UPDATE` | Rechaza si ya existen matches `scheduled`, `in_progress` o `completed` |
| DELETE | `/api/v1/teams/championships/:championshipId/teams/:teamId/players/:playerId` | Solo params | Team con jugador removido | Sí / `TEAM_UPDATE` | Rechaza si ya existen matches `scheduled`, `in_progress` o `completed` |
| PATCH | `/api/v1/teams/championships/:championshipId/teams/:teamId/players/replace` | Body: `{ oldPlayerId, newPlayerId }` | Team con sustitución aplicada | Sí / `TEAM_UPDATE` | Rechaza si ya existen matches `scheduled`, `in_progress` o `completed` |
| PATCH | `/api/v1/teams/:teamId/logo` | Multipart: campo `image` | Team con `logo` actualizado | Sí / `TEAM_UPDATE` | — |

## Player

Base real: `/api/v1/player`

| Método | Path declarado | Params / query / body | Respuesta resumida | Auth / permiso | Estado requerido |
|---|---|---|---|---|---|
| POST | `public/linkInvitation/:code/player` | Path: `code`. Body requerido: `userId`, `eps`, `gender`, `position`; opcionales `number`, `status`, `dateOfBirth`, `height`, `weight`, `dominantHand`, `nationality`, `isIndependent`, `clubId`, `experience`, `photo` | Player creado | No | No valida estado; exige invitación vigente y deadline no vencido |
| POST | `/api/v1/player/championships/:championshipId/players/manual` | Path: `championshipId`. Body: `user.{name,lastName,email}` y `player.{eps,gender,position}`; opcionales `sendEmail`, `user.phone`, `user.nie`, `player.dateOfBirth`, `player.number`, `isIndependent`, `clubId`, `experience`, `photo` | `201`, player/usuario creado | Sí / `PLAYER_CREATE` | — |
| GET | `/api/v1/player/championships/:championshipId/players` | Query opcional: `status`, `gender`, `search`, `page`, `limit` | Players paginados | Sí / `PLAYER_READ` | — |
| GET | `/api/v1/player/championships/:championshipId/players/:playerId` | Path: `championshipId`, `playerId` | Player | Sí / `PLAYER_READ` | — |
| PATCH | `/api/v1/player/championships/:championshipId/players/:playerId` | Body parcial: `eps`, `gender`, `position`, `number`, `status`, `dateOfBirth`, `height`, `weight`, `dominantHand`, `nationality`, `experience`, `photo` | Player actualizado | Sí / `PLAYER_UPDATE` | — |

Advertencia: `PLAYER_BY_LINK` está declarada sin `/` inicial:
`public/linkInvitation/:code/player`. Al montarse bajo `/api/v1/player`, no existe
una composición segura equivalente a las demás rutas y puede resultar
inalcanzable. No se normaliza aquí a un path inventado.

## Registration

Base real: `/api/v1/register`

| Método | Path real | Params / query / body | Respuesta resumida | Auth / permiso | Estado requerido |
|---|---|---|---|---|---|
| POST | `/api/v1/register/invitation-link/registration/:code` | Path: `code` de 10 caracteres. Body: `teamId`, `payerData` con al menos `name`; el service consume además datos de contacto del pagador | `201`, registration y URL/datos de pago | No | No valida estado explícito; exige invitación válida, cupo y `registrationDeadline` vigente |
| POST | `/api/v1/register/public/:code/team` | Path: `code`. Body: `team.{name,logo?,categoryId?,captainEmail?}`, `players[]` con `nie`, `name`, `email`, `gender`, `position`, `eps` y opcionales personales; `payerData` con `name`, `email` y contacto opcional | `201`, team, players, registration y `paymentUrl`; credenciales solo fuera de producción | No | No valida estado explícito; exige invitación válida, cupo y deadline vigente |
| GET | `/api/v1/register/:id` | Path: `id` de la registration | Estado/documento de registration | Sí / sin permiso adicional | — |
| POST | `/api/v1/register/tenant/:tenantId/championship/:id/registration/webhook` | Path: `tenantId`, `id` (registrationId). Query/body MercadoPago: tópico en `topic`, `type` o `action`; payment ID en `data.id` o `id` | Siempre `{ received: true }` con HTTP 200 | No; tenant extraído de params | — |

## GroupDistribution

Base real: `/api/v1/groupDistribution`

| Método | Path real | Params / query / body | Respuesta resumida | Auth / permiso | Estado requerido |
|---|---|---|---|---|---|
| POST | `/api/v1/groupDistribution/championships/:championshipId/group-distributions` | Path: `championshipId`. Body opcional: `name`, `numberOfGroups` o `cantGroups`, `groupSizePreference` o `maxTeamsPerGroup`, `minTeams`, `maxTeams`, `avoidSameClub`, `formatType`, `gameFormatId`, `customRules`, `phaseId`, `courtId`, `schedule.{enabled,date,startTime,matchDurationMinutes,breakMinutes,avoidBackToBackMatches,minRestSlots,balanceGroups}` | `201`, distribution, groups, matches, fixture, schedule y warnings | Sí / `GROUP_DISTRIBUTION_CREATE` | Sin guard explícito de estado; exige teams, registrations y positions listos. Si agenda, exige courts `reserved` para ese championship |
| GET | `/api/v1/groupDistribution/championships/:championshipId/group-distributions` | Query opcional: `status`, `formatType`, `page`, `limit` | Distributions paginadas | Sí / `GROUP_DISTRIBUTION_READ` | — |
| GET | `/api/v1/groupDistribution/championships/:championshipId/group-distributions/:groupDistributionId` | Params indicados. Query opcional: `status` | Distribution | Sí / `GROUP_DISTRIBUTION_READ` | — |
| PATCH | `/api/v1/groupDistribution/championships/:championshipId/group-distributions/:groupDistributionId/schedule-matches` | Body: `date`, `startTime`; opcionales `matchDurationMinutes`, `breakMinutes`, `avoidBackToBackMatches` | Distribution/matches agendados y resumen | Sí / `GROUP_DISTRIBUTION_UPDATE` | Sin guard explícito de estado; necesita courts compatibles disponibles/reservados |

Restricciones del body de creación: no enviar juntos `numberOfGroups` y
`cantGroups`; tampoco `groupSizePreference` y `maxTeamsPerGroup`.

## Match

Base real: `/api/v1/match`

Estados aceptados en filtros: `scheduled`, `in_progress`, `finished`, `walkover`,
`cancelled`.

| Método | Path real | Params / query / body | Respuesta resumida | Auth / permiso | Estado requerido |
|---|---|---|---|---|---|
| GET | `/api/v1/match/championships/:championshipId/matches` | Query opcional: `status`, `isEliminationMatch` (`true`/`false`), `groupId`, `eliminationBracketId` | Resultado paginado de matches | Sí / `MATCH_READ` | — |
| GET | `/api/v1/match/championships/:championshipId/matches/:matchId` | Path: `championshipId`, `matchId` | Match con relaciones pobladas | Sí / `MATCH_READ` | — |
| GET | `/api/v1/match/championships/:championshipId/groups/:groupId/matches` | Path: `championshipId`, `groupId`. Query opcional: `status` | Resultado paginado de matches del grupo | Sí / `MATCH_READ` | — |
| GET | `/api/v1/match/championships/:championshipId/elimination-brackets/:eliminationBracketId/matches` | Path: `championshipId`, `eliminationBracketId`. Query opcional: `status` | Resultado paginado de matches del bracket | Sí / `MATCH_READ` | — |

## MatchResult

La escritura de resultados está montada en el router de Match.

| Método | Path real | Params / body | Respuesta resumida | Auth / permiso | Estado requerido |
|---|---|---|---|---|---|
| POST | `/api/v1/match/:matchId/result` | Path: `matchId`. Enviar **uno solo** de: `{ sets: [{ homeTeam: number, awayTeam: number }] }` (1 a 5 sets) o `{ walkoverWinnerId: ObjectId }` | Match terminado, `winnerId`, resultado y grupo recalculado; para eliminación puede incluir/provocar progresión del bracket | Sí / `MATCH_RESULT_REGISTER` | Championship debe estar exactamente en `in_progress`; el match no puede estar ya en estado terminal |

Los sets deben contener enteros no negativos. Las reglas de victoria y puntaje
final se validan además contra `ChampionshipConfiguration.matchRules`.

## Standings

No existe un router independiente de Standings. El endpoint real pertenece a
Group.

| Método | Path real | Params | Respuesta resumida | Auth / permiso | Estado requerido |
|---|---|---|---|---|---|
| GET | `/api/v1/group/championships/:championshipId/groups/:groupId/standings` | Path: `championshipId`, `groupId` | `{ groupId, name, status, standings }` | Sí / `GROUP_READ` | — |

Cada fila de `standings` contiene:

```text
teamId, position, points, matchesPlayed, won, lost, walkovers,
setsFor, setsAgainst, setRatio, pointsFor, pointsAgainst, pointRatio
```

## Group (lecturas relacionadas)

Base real: `/api/v1/group`

| Método | Path real | Params / query | Respuesta resumida | Auth / permiso | Estado requerido |
|---|---|---|---|---|---|
| GET | `/api/v1/group/championships/:championshipId/groups` | Query consumida por controller: `status`, `groupDistributionId`, `page`, `limit`, `sortField`, `sortOrder` | Groups paginados | Sí / `GROUP_READ` | — |
| GET | `/api/v1/group/championships/:championshipId/groups/:groupId` | Path: `championshipId`, `groupId` | Group | Sí / `GROUP_READ` | — |
| GET | `/api/v1/group/group-distributions/:groupDistributionId/groups` | Query consumida: `page`, `limit`, `sortField`, `sortOrder` | Groups paginados de la distribution | Sí / `GROUP_READ` | — |

Nota: los query params anteriores son consumidos por el controller, aunque el
validator de Group actualmente solo valida los params de ruta.

## Elimination

Base real: `/api/v1/elimination`

| Método | Path real | Params / body | Respuesta resumida | Auth / permiso | Estado requerido |
|---|---|---|---|---|---|
| POST | `/api/v1/elimination/championships/:championshipId/group-distributions/:groupDistributionId/elimination-bracket` | Path: `championshipId`, `groupDistributionId`; sin body validado | Bracket, qualification, settings y matches reales de primera ronda | Sí / `ELIMINATION_BRACKET_CREATE` | No hay guard explícito de Championship; exige eliminación habilitada, todos los matches de grupos completados, standings existentes y ausencia de otro bracket `draft`/`active` |
| GET | `/api/v1/elimination/championships/:championshipId/elimination-bracket/active` | Path: `championshipId` | Bracket con status `active`, `draft` o `completed` | Sí / `ELIMINATION_BRACKET_READ` | — |
| GET | `/api/v1/elimination/championships/:championshipId/elimination-bracket/:eliminationBracketId` | Params indicados | Bracket | Sí / `ELIMINATION_BRACKET_READ` | — |
| GET | `/api/v1/elimination/championships/:championshipId/elimination-brackets` | Path: `championshipId` | Brackets del championship | Sí / `ELIMINATION_BRACKET_READ` | — |

No existe endpoint separado para avanzar el bracket: el avance se dispara al
registrar el resultado de un match de eliminación. La finalización del bracket y
del championship también ocurre dentro de ese flujo, no mediante una ruta
adicional.

## InvitationLink / Public Registration Link

Base real: `/api/v1/invitationLink`

El prefijo `/invitationLink` lo agrega dinámicamente `routes/index.ts` a partir
del archivo `routes/invitationlink/invitationLink.ts`. Todos los endpoints,
incluido el público, ejecutan `origin.checkDomain` y `origin.checkTenant`; el
request debe incluir un `Origin` que permita resolver un tenant válido.

| Acción | Método | Path completo | Params / query / body | Response real resumida | Auth / permiso | Estado esperado |
|---|---|---|---|---|---|---|
| `GENERATE_LINK` | POST | `/api/v1/invitationLink/championships/:championshipId/invitation-link` | Path: `championshipId` (ObjectId). Body: `{ maxUses: integer, expiresAt: ISO-8601 }` | `201`, `{ invitationLink, expiresAt, code }`, sin wrapper | Sí / `invitation-link:create` | Championship/configuración existentes; sin otro documento `isActive: true`; `maxUses <= maxTeams`; expiración futura y anterior al inicio |
| `USE_LINK` | POST | `/api/v1/invitationLink/championships/invitation/use` | Body: `{ code: string }` | `200`, `{ success: true, data: { championshipId, maxUses, usedCount, expiresAt }, message }` | **Público: sin JWT ni permiso**; sí requiere Origin/tenant | Link activo, no expirado y con usos disponibles; incrementa `usedCount` |
| `GET_LINK_STATS` | GET | `/api/v1/invitationLink/championships/:championshipId/invitation-link/stats` | Path: `championshipId` | `200`, `{ usedCount, maxUses, remainingUses, expiresAt, isActive, code }`; si no encuentra, `null` | Sí / `invitation-link:read` | Lectura; afectado por la inconsistencia de params indicada debajo |
| `GET_ALL_LINKS` | GET | `/api/v1/invitationLink/championships/invitation-link/all` | Query opcional: `page`, `limit`, `sortField` (default `createdAt`), `sortOrder` | `200`, paginación directa con `docs`; selecciona campos del link y popula `championshipId.name` | Sí / `invitation-link:read` | Historial del tenant, sin filtro de estado |
| `DEACTIVATE_LINK` | DELETE | `/api/v1/invitationLink/championships/:championshipId/invitation-link` | Path: `championshipId`; sin body | `200`, `{ success: true, data: "Invitation link deactivated successfully" }` | Sí / `invitation-link:manage` | Pretende cambiar `isActive` a `false`; puede responder éxito sin actualizar por el defecto actual |
| `GET_ACTIVE_LINK` | GET | `/api/v1/invitationLink/championships/:championshipId/invitation-link` | Path: `championshipId` | `200`, documento `InvitationLink` directo; ausencia prevista: `404` | Sí / `invitation-link:read` | Busca `isActive: true`; afectado por la inconsistencia de params indicada debajo |

### Payloads principales

Generación:

```json
{
  "maxUses": 16,
  "expiresAt": "2026-08-25T23:59:00.000Z"
}
```

```json
{
  "invitationLink": "https://frontend.example/register?code=abc123",
  "expiresAt": "2026-08-25T23:59:00.000Z",
  "code": "abc123"
}
```

La URL se llama `invitationLink`, no `url`. No devuelve `status`; el documento
se crea con `isActive: true` y `usedCount: 0`.

Uso público:

```json
{
  "code": "abc123"
}
```

```json
{
  "success": true,
  "data": {
    "championshipId": "ObjectId",
    "maxUses": 16,
    "usedCount": 1,
    "expiresAt": "2026-08-25T23:59:00.000Z"
  },
  "message": "Link used successfully"
}
```

GET active devuelve directamente campos equivalentes a:

```text
_id, championshipId, code, expiresAt, isActive, maxUses, usedCount,
createdAt, updatedAt
```

### Estado efectivo y defectos conocidos

El modelo no tiene `status`. El link solo es utilizable cuando:

```text
isActive === true
expiresAt > ahora
usedCount < maxUses
```

Expirar o agotar usos no cambia `isActive` automáticamente. Además,
`GENERATE_LINK` solo comprueba `isActive: true`, por lo que un link expirado que
siga activo puede bloquear uno nuevo con `LINK_ALREADY_EXISTS`.

`GET_ACTIVE_LINK`, `GET_LINK_STATS` y `DEACTIVATE_LINK` declaran
`:championshipId`, pero sus controllers leen `req.params.id`. Actualmente:

- GET active normalmente responde `404` aunque exista el link;
- stats normalmente responde `200` con `null`;
- deactivate puede responder `200` sin desactivar ningún documento.

Son defectos conocidos, no endpoints alternativos.

## Upload images

No existe un router genérico de uploads para Frontend V1. Los uploads reales son
operaciones de sus recursos y esperan `multipart/form-data` con el campo
`image`.

| Método | Path real | Params / body | Respuesta resumida | Auth / permiso | Estado requerido |
|---|---|---|---|---|---|
| PATCH | `/api/v1/championship/:championshipId/logo` | Path: `championshipId`; multipart `image` | Championship con logo actualizado | Sí / `CHAMPIONSHIP_UPDATE` | — |
| PATCH | `/api/v1/championship/:championshipId/banner` | Path: `championshipId`; multipart `image` | Championship con banner actualizado | Sí / `CHAMPIONSHIP_UPDATE` | — |
| PATCH | `/api/v1/teams/:teamId/logo` | Path: `teamId`; multipart `image` | Team con logo actualizado | Sí / `TEAM_UPDATE` | — |
| PATCH | `/api/v1/profile/:userId/avatar` | Path: `userId`; multipart `image` | Perfil con avatar actualizado | Sí / `PROFILE_UPDATE` | — |

## Rutas no incluidas

Las constantes de rutas de fases, callbacks de pago y auth social que no están
registradas actualmente en un `Router` no forman parte de este contrato.
