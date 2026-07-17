# Matriz CRUD real del módulo Championship

## 1. Alcance del análisis

Estado verificado después de reindexar el repositorio completo con `codebase-memory-mcp`. Se revisaron:

- `src/api/routes`
- `src/api/controllers`
- `src/api/services`
- `src/api/models/mongoose/championship`
- `src/api/constants/apiRoutes`

La matriz refleja solamente rutas y métodos que existen en el código actual. Una constante declarada sin registro en un `router` no se considera endpoint existente.

## 2. Convención real de montaje

`src/api/routes/index.ts` recorre automáticamente todos los subdirectorios de `src/api/routes`, importa cada archivo `.ts`/`.js` y lo monta usando **el nombre del archivo**, no el directorio:

```ts
this.router.use(`/${routeName}`, route);
```

El servidor monta ese router bajo `env.API_PREFIX`, cuyo default es `/api/v1`.

Ejemplos:

- `routes/championship/championship.ts` → `/api/v1/championship`
- `routes/gameformat/gameFormat.ts` → `/api/v1/gameFormat`
- `routes/players/player.ts` → `/api/v1/player`
- `routes/groupDistribution/groupDistribution.ts` → `/api/v1/groupDistribution`

Todos los route files mencionados en esta matriz están dentro del árbol que `RouteLoader` intenta cargar. No se detectó un route file huérfano por falta de montaje manual. Si un `require()` falla durante el arranque, el loader registra el error y la ruta concreta no queda disponible; por eso la verificación de compilación sigue siendo relevante.

## 3. Resumen ejecutivo

| Módulo | Create | Read | Update | Delete | Operaciones de dominio | Estado |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Championship | Sí | Sí | Parcial | No | Registro de equipo, status | Parcial |
| ChampionshipConfiguration | Sí, acoplado | Sí | Sí | No | Reglas deportivas | Parcial |
| GroupDistribution | Sí | No | No | No | Genera grupos, fixture y scheduling | Parcial |
| Group | Interno | Servicio parcial | No | No | Standings | Pendiente |
| Match | Interno | No | Resultado solamente | No | Resultado y progresión | Parcial |
| Court | Seed/modelo | No | No | No | Consulta estática disponible en modelo | Pendiente |
| GameFormat | Sí | Sí | No | No | — | Parcial |
| Team | Sí, por invitación | No | No | No | Validación de jugadores | Parcial |
| Player | Sí, por invitación | No | No | No | Validación de posición | Parcial |
| Referee | No | No | No | No | Solo existe el rol auth | Pendiente |
| EliminationBracket | Sí, por generación | No | Progresión interna | No | Clasificación y avance | Parcial |

## 4. Matriz detallada

### 4.1 Championship

| Elemento | Estado actual |
|---|---|
| Model | `src/api/models/mongoose/championship/championship.ts` |
| Route file | `src/api/routes/championship/championship.ts` |
| Constantes | `src/api/constants/apiRoutes/championship/championshipsRoutes.ts` |
| Controller | `src/api/controllers/championship/championship.controller.ts` — `ChampionshipController` |
| Service | `src/api/services/championship/championship.service.ts` — `ChampionshipService` |
| Estado | **Parcial** |

Métodos existentes del controller:

- `create`
- `registerTeam`
- `getActive`
- `updateStatus`
- `getById`
- `updateChampionshipConfiguration`
- `getChampionshipConfiguration`

Métodos públicos relevantes del service:

- `create`
- `updateStatus`
- `registerTeam`
- `setWinners`
- `getActive`
- `getPaginated`
- `generateLink`
- `findByDateRange`
- `findById`
- `updateConfiguration`
- `getConfigurationById`
- `addRegistrationId`
- `updateTeamId`
- `deleteTeamId`
- `deleteRegistrationId`

Endpoints existentes:

| Método | Endpoint |
|---|---|
| `POST` | `/api/v1/championship/` |
| `GET` | `/api/v1/championship/` |
| `GET` | `/api/v1/championship/:id` |
| `PATCH` | `/api/v1/championship/` — actualización de status, no update general por ID |
| `POST` | `/api/v1/championship/:id/teams` |
| `PATCH` | `/api/v1/championship/:idConfiguration/configuration` |
| `GET` | `/api/v1/championship/:idConfiguration/configuration` |

Endpoints faltantes:

- Update general por `championshipId`.
- Delete/archive explícito del campeonato.
- Endpoint público para `getPaginated`.
- Endpoint público para `findByDateRange`.
- Endpoint público para `setWinners`.
- Remover equipo mediante HTTP, aunque existe `deleteTeamId` en servicio.

Recomendación: implementar primero `PATCH /:id` para datos generales y una operación de archivado/cancelación claramente separada de la eliminación física. Corregir la ambigüedad del `PATCH /`, que depende del body para localizar el campeonato.

### 4.2 ChampionshipConfiguration

| Elemento | Estado actual |
|---|---|
| Model | `src/api/models/mongoose/championship/configuration.ts` |
| Route file | Comparte `src/api/routes/championship/championship.ts` |
| Constantes | Comparte `championshipsRoutes.ts` |
| Controller | Métodos de configuración en `ChampionshipController` |
| Services | `ChampionshipService` para GET/PATCH; `ConfigurationService` para create/get/update internos |
| Estado | **Parcial** |

Métodos existentes:

- Controller: `updateChampionshipConfiguration`, `getChampionshipConfiguration`.
- `ConfigurationService`: `create`, `getByChampionshipId`, `update`.
- `ChampionshipService`: `updateConfiguration`, `getConfigurationById`.

Endpoints existentes:

| Método | Endpoint |
|---|---|
| `POST` | `/api/v1/championship/` crea campeonato y configuración como flujo acoplado |
| `GET` | `/api/v1/championship/:idConfiguration/configuration` |
| `PATCH` | `/api/v1/championship/:idConfiguration/configuration` |

Endpoints faltantes:

- Create independiente de configuración.
- GET por `championshipId`; el servicio existe, pero no está expuesto.
- Delete/archive de configuración.
- Historial o versionado de reglas.

Recomendación: conservar una sola configuración activa por campeonato y exponer GET por `championshipId`, evitando que el cliente tenga que conocer primero `configurationId`. No implementar delete físico mientras el campeonato dependa de ella.

### 4.3 GroupDistribution

| Elemento | Estado actual |
|---|---|
| Model | `src/api/models/mongoose/championship/groupsDistrubution.ts` |
| Route file | `src/api/routes/groupDistribution/groupDistribution.ts` |
| Constantes | `src/api/constants/apiRoutes/championship/groupDistribution.ts` |
| Controller | `src/api/controllers/championship/groupDistribution.controller.ts` — clase `groupDistribution` |
| Service | `src/api/services/championship/groupDistribution.service.ts` |
| Estado | **Parcial** |

Métodos ejecutables:

- Controller: `autoCreateGroupDistribution`.
- Service: `createGroupDistribution` y helpers privados.

El método de creación también crea documentos `Group`, genera los `Match` round-robin y opcionalmente asigna canchas/horarios.

Endpoint existente:

| Método | Endpoint |
|---|---|
| `POST` | `/api/v1/groupDistribution/championships/:championshipId/group-distributions` |

Constantes sin endpoint registrado:

- `GET_ALL_GROUP_DISTRIBUTION`
- `UPDATE_GROUP_DISTRIBUTION`
- `DELETE_GROUP_DISTRIBUTION`

Los handlers GET/update/delete aparecen comentados en el controller/service antiguo; no cuentan como implementación.

Endpoints faltantes:

- Listar distribuciones por campeonato.
- Obtener distribución por ID.
- Actualizar draft antes de activarlo.
- Archivar/eliminar distribución.
- Regenerar con política explícita de `forceRegenerate`.

Recomendación: implementar primero GET por campeonato e ID. Después diseñar archivado/regeneración transaccional, porque la creación tiene efectos sobre grupos y partidos.

### 4.4 Group

| Elemento | Estado actual |
|---|---|
| Model | `src/api/models/mongoose/championship/group.ts` |
| Route file | **No existe** |
| Controller | **No existe** |
| Service | `src/api/services/championship/group.service.ts` |
| Estado | **Pendiente** como API; parcial como lógica interna |

Métodos existentes del service:

- `createGroup`
- `getGroupStandings`

La creación real del flujo automático también se hace directamente desde `GroupDistributionService`, sin pasar por `GroupService`.

Endpoints existentes: ninguno.

Endpoints faltantes:

- Listar grupos por distribución/campeonato.
- Obtener grupo por ID con equipos y partidos.
- Obtener standings del grupo.
- Update de nombre/status si se requiere administración.
- Archive/delete controlado.

Recomendación: implementar primero endpoints read-only: lista de grupos, detalle y standings. Antes de exponer `createGroup`, alinear los campos antiguos de rankings usados por `GroupService` con el schema actual (`won`, `lost`, `setsFor`, etc.).

### 4.5 Match

| Elemento | Estado actual |
|---|---|
| Model | `src/api/models/mongoose/championship/match.ts` |
| Route file | `src/api/routes/match/match.ts` |
| Constantes | `src/api/constants/apiRoutes/championship/match.ts` |
| Controller | `src/api/controllers/championship/match.controller.ts` |
| Service | `src/api/services/championship/match.service.ts` |
| Estado | **Parcial** |

Métodos existentes:

- Controller: `registerMatchResult`.
- Service: `registerMatchResult` más helpers de mapeo y recálculo de standings.

El mismo resultado sirve para partidos de grupo y eliminación. Si `isEliminationMatch` es verdadero, el service invoca `EliminationProgressionService.advanceAfterMatchResult()`.

Endpoint existente:

| Método | Endpoint |
|---|---|
| `POST` | `/api/v1/match/:matchId/result` |

Endpoints faltantes:

- Crear partido independiente; hoy se crea internamente desde distribución/eliminación.
- Listar por campeonato, grupo, fase o bracket.
- Obtener detalle por ID.
- Actualizar programación, cancha o status `in_progress`.
- Corregir/reabrir resultado con auditoría.
- Cancelar/archive/delete.

Recomendación: priorizar GET list/detail y PATCH de scheduling. Mantener la creación ligada a los flujos de fixture y bracket, y diseñar una corrección de resultados transaccional antes de permitir editar partidos terminados.

### 4.6 Court

| Elemento | Estado actual |
|---|---|
| Model | `src/api/models/mongoose/championship/court.ts` |
| Route file | **No existe** |
| Controller | **No existe** |
| Service | **No existe**; hay seed y acceso desde otros services |
| Estado | **Pendiente** |

El model incluye el estático `findAvailable()`. `GroupDistributionService` consulta canchas relacionadas con el campeonato para scheduling. También existe `src/api/seeds/courts.seed.ts`, pero un seed no equivale a CRUD HTTP.

Endpoints existentes: ninguno.

Endpoints faltantes:

- Crear cancha.
- Listar canchas por campeonato y disponibilidad.
- Obtener detalle.
- Actualizar estado, capacidad y metadatos.
- Archivar/eliminar.
- Registrar mantenimiento.

Recomendación: implementar CRUD básico por campeonato, empezando por GET y PATCH de disponibilidad, porque el scheduler depende del estado `available`.

### 4.7 GameFormat

| Elemento | Estado actual |
|---|---|
| Model | `src/api/models/mongoose/championship/gameFormat.ts` |
| Route file | `src/api/routes/gameformat/gameFormat.ts` |
| Constantes | No usa archivo de constantes; usa `'/'` directamente |
| Controller | `src/api/controllers/championship/gameFormat.controller.ts` |
| Service | `src/api/services/championship/gameformat.service.ts` |
| Estado | **Parcial** |

Métodos existentes:

- Controller: `create`, `getAll`.
- Service: `create`, `getAll`.

Endpoints existentes:

| Método | Endpoint |
|---|---|
| `POST` | `/api/v1/gameFormat/` |
| `GET` | `/api/v1/gameFormat/` |

Endpoints faltantes:

- GET por ID.
- PATCH/PUT.
- Archive/delete.

Recomendación: añadir GET por ID y PATCH. Si los formatos son catálogo global/seed y no recursos editables por tenant, documentar esa decisión y restringir POST a administración.

### 4.8 Team

| Elemento | Estado actual |
|---|---|
| Model | `src/api/models/mongoose/championship/team.ts` |
| Route file | `src/api/routes/teams/teams.ts` |
| Constantes | `src/api/constants/apiRoutes/championship/teams.ts` |
| Controller | `src/api/controllers/championship/teams.controller.ts` |
| Service | `src/api/services/championship/teams.service.ts` |
| Estado | **Parcial** |

Métodos existentes:

- Controller: `createTeamByLink`.
- Service: `createTeamByLink`; validación privada de jugadores.
- `ChampionshipService` también contiene `registerTeam`, `updateTeamId` y `deleteTeamId` para asociaciones con el campeonato.

Endpoints existentes:

| Método | Endpoint |
|---|---|
| `POST` | `/api/v1/teams/linkInvitation/:code` |
| `POST` | `/api/v1/championship/:id/teams` — registra/asocia un team existente |

Constantes sin endpoint registrado:

- `CREATE_TEAM` está vacío.
- `REMOVE_TEAM` declara `/teams/:teamId`, pero no se usa en el router.

Endpoints faltantes:

- Create autenticado sin invitación, si el negocio lo permite.
- Listar por campeonato.
- Obtener por ID.
- Actualizar roster, club, nombre o status.
- Remover del campeonato.
- Archive/delete.

Recomendación: implementar primero GET por campeonato e ID, luego PATCH del roster con las mismas validaciones de duplicidad de jugadores usadas en creación.

### 4.9 Player

| Elemento | Estado actual |
|---|---|
| Model | `src/api/models/mongoose/championship/player.ts` |
| Route file | `src/api/routes/players/player.ts` |
| Constantes | `src/api/constants/apiRoutes/championship/player.ts` |
| Controller | `src/api/controllers/championship/player.controller.ts` — clase `playerController` |
| Service | `src/api/services/championship/player.service.ts` |
| Estado | **Parcial** |

Métodos existentes:

- Controller: `createPlayerByLink`.
- Service: `createPlayerByLink`; helper privado `validatePosition`.

Endpoint existente:

| Método | Endpoint |
|---|---|
| `POST` | `/api/v1/player/linkInvitation/:code` |

Constantes sin endpoint registrado:

- `PLAYER_BY_ID`
- `PLAYER_BY_EMAIL`

Endpoints faltantes:

- GET por ID.
- GET por email.
- Listar jugadores.
- Update de perfil deportivo/status.
- Update de estadísticas; existe solo un stub comentado.
- Archive/delete.

Recomendación: implementar GET por ID y listado filtrable. Después PATCH del perfil deportivo, manteniendo la validación de posición según `ChampionshipType`.

### 4.10 Referee

| Elemento | Estado actual |
|---|---|
| Model | **No existe en `models/mongoose/championship`** |
| Route file | **No existe** |
| Controller | **No existe** |
| Service | **No existe** |
| Estado | **Pendiente** |

Solo se encontró `AuthRole.REFEREE` en `src/api/constants/apiRoutes/auth/authRoutes.ts`. Un rol de autenticación no implementa un recurso de árbitros ni asignaciones a partidos.

Endpoints existentes: ninguno.

Endpoints faltantes:

- CRUD de árbitro, si será entidad separada de `User`.
- Listado de árbitros disponibles.
- Asignar/desasignar árbitro a partido.
- Agenda y conflictos de horario.
- Estado/disponibilidad.

Recomendación: primero decidir el modelo: perfil/ref de `User` frente a colección `Referee`. Después implementar disponibilidad y asignación a `Match`; no crear CRUD duplicado si el usuario con rol contiene toda la identidad necesaria.

### 4.11 EliminationBracket

| Elemento | Estado actual |
|---|---|
| Model | `src/api/models/mongoose/championship/eliminationBracket.ts` |
| Route file | `src/api/routes/elimination/elimination.ts` |
| Constantes | `src/api/constants/apiRoutes/championship/elimination.ts` |
| Controller | `src/api/controllers/championship/elimination.controller.ts` |
| Services | `src/api/services/championship/elimination.service.ts` y `eliminationProgression.service.ts` |
| Estado | **Parcial**, con create y progresión interna |

Métodos existentes:

- Controller: `generateBracket`.
- `EliminationService`: `generateBracketFromGroupDistribution`.
- `EliminationProgressionService`: `advanceAfterMatchResult` y creación interna de partidos que quedan listos.

El flujo actual:

1. valida configuración, grupos, standings y partidos de grupo terminados;
2. calcula clasificados y bracket;
3. evita otro bracket `draft`/`active` para la misma distribución;
4. persiste `EliminationBracket`;
5. crea los partidos reales de primera ronda;
6. al registrar resultados eliminatorios, avanza ganador y crea nuevos partidos listos.

Endpoint existente:

| Método | Endpoint |
|---|---|
| `POST` | `/api/v1/elimination/championships/:championshipId/group-distributions/:groupDistributionId/elimination-bracket` |

Endpoints faltantes:

- GET bracket activo por campeonato/distribución.
- GET por ID con matches.
- Listar historial de brackets archived/completed.
- Archive/cancel.
- Regenerar de forma explícita.
- Endpoint administrativo de avance/reparación; el avance normal hoy ocurre desde el resultado del match.
- Delete físico, si realmente fuera necesario.

Recomendación: implementar primero GET activo y GET por ID. Después añadir archive/regenerate con permisos y transacción; no exponer avance manual salvo como operación administrativa auditada.

## 5. Rutas declaradas pero no implementadas

| Constante | Archivo | Situación |
|---|---|---|
| `CHAMPIONSHIPS_ACTIVE` | `championshipsRoutes.ts` | No se registra; GET `/` usa `getActive`. |
| Rutas de fases/matches | `championshipsRoutes.ts` | Constantes presentes, sin handlers en `championship.ts`. |
| `GET_ALL_GROUP_DISTRIBUTION` | `groupDistribution.ts` | Sin `router.get`. |
| `UPDATE_GROUP_DISTRIBUTION` | `groupDistribution.ts` | Sin `router.patch/put`. |
| `DELETE_GROUP_DISTRIBUTION` | `groupDistribution.ts` | Sin `router.delete`. |
| `CREATE_TEAM` | `teams.ts` | Valor vacío y sin handler. |
| `REMOVE_TEAM` | `teams.ts` | Sin handler. |
| `PLAYER_BY_ID` | `player.ts` | Sin handler. |
| `PLAYER_BY_EMAIL` | `player.ts` | Sin handler. |

## 6. Prioridades recomendadas

### Prioridad 1 — lectura operativa

Implementar endpoints GET que permitan al front consumir el estado ya persistido:

1. Match list/detail.
2. Group list/detail/standings.
3. EliminationBracket activo/detail.
4. Team y Player list/detail.
5. GroupDistribution list/detail.

El backend ya genera esos datos; la mayor carencia inmediata es poder consultarlos mediante HTTP.

### Prioridad 2 — consistencia y correcciones

1. Transacciones para resultado + standings y bracket + matches.
2. Corrección/reapertura auditada de resultados.
3. Archive/regenerate de distribuciones y brackets.
4. Validar pertenencia cruzada entre championship, distribución, grupos y bracket.
5. Alinear `GroupService` con el schema actual de rankings.

### Prioridad 3 — administración CRUD

1. Championship update general y archive.
2. Court CRUD y disponibilidad.
3. GameFormat GET por ID/PATCH.
4. Team y Player PATCH/archive.
5. Decisión de dominio e implementación de Referee.

## 7. Conclusión

El módulo tiene implementado el núcleo de creación del campeonato y los flujos deportivos principales, pero no un CRUD HTTP completo. Predominan comandos de negocio —crear campeonato, distribuir grupos, registrar resultado y generar bracket— mientras faltan consultas y operaciones administrativas.

El siguiente bloque de implementación debería ser read-only: exponer Group, Match y EliminationBracket. Esto habilita el consumo del flujo actual sin introducir todavía mutaciones adicionales ni riesgos de consistencia.
