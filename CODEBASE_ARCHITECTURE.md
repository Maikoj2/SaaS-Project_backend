# Arquitectura del repositorio SAAS-Project-BackEnd

> Informe generado el 14 de julio de 2026 a partir del índice completo de `codebase-memory` (`C-Users-User-Desktop-SAAS-Project-BackEnd`): 1.484 nodos, 4.024 relaciones y 207 archivos. No se describen componentes que no estén presentes en el repositorio.

## 1. Visión general y estructura de carpetas

El proyecto es un backend multi-tenant en TypeScript, Express y Mongoose. La estructura combina una arquitectura por capas para la API con un subdominio funcional de competición compuesto por motores puros.

| Ruta | Responsabilidad observada |
|---|---|
| `index.ts` | Entrada mínima que importa/inicia la aplicación. |
| `src/app.ts` | `bootstrap`, conexión a MongoDB, inicio del servidor y cierre ordenado. |
| `src/api/config/` | Entorno, MongoDB, logger Winston, Passport/JWT y configuración de autenticación. |
| `src/api/constants/` | Permisos, constantes de usuario/campeonato y valores de endpoints. |
| `src/api/controllers/` | Adaptadores HTTP de auth, usuarios, perfil, campeonato, equipos, jugadores, posiciones, inscripción, enlaces y plugins. |
| `src/api/services/` | Casos de uso y acceso a persistencia por área funcional. |
| `src/api/domain/championship/competition/` | Motores independientes para grupos, fixture, canchas, resultados, tabla, clasificación y llaves. |
| `src/api/models/mongoose/` | Esquemas y modelos persistentes de MongoDB. |
| `src/api/models/server/` | Clase `Server`, composición de Express y ciclo de vida HTTP. |
| `src/api/routes/` | Routers Express cargados dinámicamente por `RouteLoader`. |
| `src/api/middlewares/` | Autenticación, permisos/roles, resolución de tenant/origen y errores. |
| `src/api/validators/` | Cadenas de express-validator y validadores específicos. |
| `src/api/plugin/` | Infraestructura de plugins y adaptación de Mercado Pago. |
| `src/api/responses/` y `src/api/errors/` | Respuestas uniformes y jerarquía de errores. |
| `src/api/utils/` | Helpers de base de datos, consultas, contraseñas, fechas y transformación. |
| `src/api/seeds/` | Semillas de canchas y formatos de juego. |
| `src/api/templates/` | Plantillas HTML de correo. |
| `src/test/` | Pruebas/manuales de los motores de competición y prototipo HTML de bracket. |
| `docs/` | Auditorías de seguridad, roles y aislamiento multi-tenant. |

El grafo identifica comunidades especialmente cohesionadas para distribución de grupos, resultados/tabla, bracket, progresión de bracket, clasificación y arranque. Esto confirma que `domain/championship/competition` constituye una frontera funcional real, aunque aún no una capa plenamente integrada con HTTP/persistencia.

## 2. Punto de entrada y flujo de inicialización

1. `index.ts` activa `src/app.ts`.
2. `src/app.ts:bootstrap()` carga variables con dotenv, crea `Logger`, ejecuta `DatabaseConnection.connect()`, construye `Server`, llama `Server.start()` y registra `setupGracefulShutdown()`.
3. `src/api/config/db/Mongoose/connection.ts:DatabaseConnection.connect()` valida el entorno y conecta Mongoose usando `DB_URI`/`DB_NAME`; `setupConnectionHandlers()` registra eventos y `closeConnection()` cierra MongoDB.
4. `src/api/models/server/server.ts:Server` crea Express. `setupMiddlewares()` instala CORS, JSON/body parsing, Passport, estáticos y logging de petición; `setupRoutes()` monta el router bajo `env.API_PREFIX`; `setupErrorHandling()` instala el middleware global de errores.
5. `src/api/routes/index.ts:RouteLoader.loadRoutes()` recorre los subdirectorios de `routes`, carga sus archivos `.ts` y `loadRouteFile()` monta cada router usando el nombre de carpeta como prefijo.
6. `setupGracefulShutdown()` atiende señales/errores, cierra servidor y base de datos y termina el proceso.

Con `.env.example`, el prefijo base esperado es `/api/v1`. Una ruta declarada como `/` en `routes/championship/championship.ts` queda por tanto bajo `/api/v1/championship/`.

## 3. Módulos funcionales encontrados

- Identidad: registro, verificación, login, refresh token, recuperación/cambio de contraseña y autenticación social provisional.
- Usuarios y perfil: CRUD de usuarios, perfil, contraseña y estado de onboarding (`stepper`).
- Multi-tenancy: validación de dominio, resolución de tenant y extracción explícita de tenant para webhooks.
- Autorización: permisos granulares y middleware de roles heredado.
- Campeonatos: CRUD parcial, configuración, estado e inscripción de equipos.
- Inscripciones y pagos: invitaciones, registros, estado y webhook de Mercado Pago.
- Equipos, jugadores, posiciones y formatos de juego.
- Distribución de grupos.
- Competición: fixture round-robin, programación en canchas, carga/validación de resultados, standings, clasificación, bracket y progresión.
- Plugins: catálogo/gestión parcial y plugin Mercado Pago.
- Comunicación: email y servicio social Facebook.

## 4. Modelos y relaciones entre entidades

Los modelos Mongoose reales están en `src/api/models/mongoose/`:

- Campeonato: `championship/championship.ts`, `configuration.ts`, `court.ts`, `gameFormat.ts`, `group.ts`, `groupsDistrubution.ts`, `invitationLink.ts`, `match.ts`, `phase.ts`, `player.ts`, `position.ts`, `registration.ts`, `statistics.ts`, `team.ts` y `club.ts`.
- Identidad/tenant: `user/User.ts`, `setting/setting.ts`, `referred/referred.ts` y `forgotPassword.model.ts`.
- Plugins: `plugins/plugins.ts` y `plugins/pluginsettings.ts`.

Las relaciones observadas en los esquemas y usos de servicios son:

- Un campeonato agrega configuración, formatos/fases, equipos, inscripciones y distribuciones de grupos mediante identificadores.
- `Registration` vincula campeonato/tenant y el proceso de pago; `ChampionshipService.addRegistrationId()` y `deleteRegistrationId()` mantienen la colección asociada.
- `Team` agrupa jugadores y se registra en un campeonato; `ChampionshipService.registerTeam()`, `addRegistrationId()`, `updateTeamId()` y `deleteTeamId()` coordinan las referencias.
- `Position` asigna orden/posición a inscripciones de un campeonato; `PositionService` ofrece asignación automática, manual, aleatoria y por registro.
- `Group`/`groupsDistrubution` representan la distribución persistida; el motor puro usa DTOs y `competition.mapper.ts` traduce entre posiciones, equipos de competición, mapa de distribución y Mongo.
- `Match`, `Phase`, `Court` y `Statistics` representan la ejecución deportiva, aunque la integración HTTP/persistente de los motores nuevos aún es parcial.
- `InvitationLink` pertenece al flujo de campeonato e inscripción.
- `PluginSettings` y `Setting` aportan configuración por tenant; Mercado Pago busca configuración específica mediante `findSettingTenant()`/`getSetting()`.

No hay relaciones ORM tipadas como aristas propias en el índice; las anteriores se sustentan en los campos de esquema, llamadas de servicio y mappers, no en supuestos de una base relacional.

## 5. Controladores y servicios utilizados

| Controlador (archivo) | Servicios observados |
|---|---|
| `AuthController` — `src/api/controllers/auth/auth.controller.ts` | `AuthService`, `SettingsService` |
| `AuthSocialController` — `src/api/controllers/auth/authSocial.controller.ts` | `FacebookService` |
| `UserController` — `src/api/controllers/users/user.controller.ts` | `UserService`, `EmailService`, `AuthService` |
| `ProfileController` — `src/api/controllers/profile/profile.controller.ts` | `ProfileService` |
| `ChampionshipController` — `src/api/controllers/championship/championship.controller.ts` | `ChampionshipService`, `ConfigurationService` |
| `GameFormatController` — `src/api/controllers/championship/gameFormat.controller.ts` | `GameFormatService` |
| `groupDistribution` — `src/api/controllers/championship/groupDistribution.controller.ts` | `GroupDistributionService` |
| `InvitationLinkController` — `src/api/controllers/championship/invitationLink.controller.ts` | `InvitationLinkService` |
| `playerController` — `src/api/controllers/championship/player.controller.ts` | `PlayerService` |
| `PositionController` — `src/api/controllers/championship/position.controller.ts` | `PositionService` |
| `RegistrationController` — `src/api/controllers/championship/register.controller.ts` | `RegistrationService` (`register.service.ts`), `ChampionshipService` |
| `TeamController` — `src/api/controllers/championship/teams.controller.ts` | `TeamService` |
| `PluginsController` — `src/api/controllers/plugins/plugins.controller.ts` | `PluginsService` |
| `PaymentController` — `src/api/plugin/mercadopago/controller/mp.controller.ts` | `PaymentService` |

También existen `MatchService`, `GroupService`, `RegistrationService` duplicado en `registration.service.ts`, `PluginService` y servicios de email/configuración, algunos sin controlador HTTP activo equivalente.

## 6. Rutas y endpoints por controlador

Las rutas se montan como `${API_PREFIX}/${nombreDelDirectorio}${rutaDeclarada}`. Tabla de endpoints activos verificados:

| Router / controlador | Método y ruta declarada | Handler |
|---|---|---|
| `auth` / `AuthController` | POST `/verify/:tenant/:verificationCode` | `verify` |
| | POST `/register` | `register` |
| | POST `/login` | `login` |
| | GET `/check` | `checkExist` |
| | GET `/token` | `verifyToken` |
| | POST `/forgot-password` | `forgotPassword` |
| | POST `/reset-password` | `resetPassword` |
| | POST `/refresh-token` | `refreshToken` |
| `championship` / `ChampionshipController` | POST `/` | `create` |
| | GET `/` | `getActive` |
| | GET `/:id` | `getById` |
| | PATCH `/` | `updateStatus` |
| | POST `/:id/teams` | `registerTeam` |
| | PATCH `/:idConfiguration/configuration` | `updateChampionshipConfiguration` |
| | GET `/:idConfiguration/configuration` | `getChampionshipConfiguration` |
| `gameformat` / `GameFormatController` | GET `/` | `getAll` |
| | POST `/` | `create` |
| `groupDistribution` / `groupDistribution` | POST `/championships/:championshipId/group-distributions` | `autoCreateGroupDistribution` |
| `invitationlink` / `InvitationLinkController` | POST `/championships/:id/invitation` | `generateLink` |
| | POST `/championships/invitation/use` | `useInvitationLink` |
| | GET `/championships/:id/invitation` | `getActiveLink` |
| | DELETE `/championships/:id/invitation` | `deactivateLink` |
| | GET `/championships/:id/invitation/stats` | `getLinkStats` |
| | GET `/championships/:id/invitation/all` | `getAllLinks` |
| `registerTeamToChampionship` / `RegistrationController` | POST `/invitation-link/registration/:code` | `registerWithInvitation` |
| | GET `/:id` | `getRegistrationStatus` |
| | POST `/tenant/:tenantId/championship/:id/registration/webhook` | `handlePaymentWebhook` |
| `teams` / `TeamController` | POST `/linkInvitation/:code` | `createTeamByLink` |
| `position` / `PositionController` | POST `/auto-assign-positions/:championshipId` | `autoAssignPositions` |
| | Rutas declaradas adicionales: `/manual-assign-positions/:championshipId`, `/assign-position-by-registration-id/:registrationId`, `/assign-random-positions/:championshipId`, `/get-positions-by-championship-id/:championshipId` | Métodos homónimos del controlador; revisar exposición activa en el archivo |
| `profile` / `ProfileController` | GET `/` | `getProfile` |
| | PATCH `/` | `updateProfile` |
| | POST `/changePassword` | `changePassword` |
| | PATCH `/stepper` | `updateStepper` |
| `users` / `UserController` | GET `/` | `getUsers` |
| | GET `/:id` | `getUserById` |
| | POST `/` | `createUser` |
| | PATCH `/:id` | `updateUser` |
| | DELETE `/:id` | `deleteUser` |
| `plugins` / `PluginsController` | GET `/` | `getItems` |

`src/api/routes/match/match.ts` y `src/api/routes/players/player.ts` existen, pero el índice no detectó endpoints activos suficientes para documentarlos con certeza. `authSocial/socialAuth.ts` tiene Facebook comentado. En `plugins/plugins.ts` solo GET `/` está activo; las rutas CRUD/eventos restantes están comentadas.

## 7. Middlewares

- Tenant/origen — `src/api/middlewares/auth/origin.ts`: `checkDomain()` valida el origen/dominio y `checkTenant()` resuelve/valida el tenant. El grafo marca ambos como recursivos por callbacks, no como recursión algorítmica intencional.
- Autenticación — `src/api/middlewares/auth.middleware.ts:auth()`: valida credenciales/token, construye el contexto de usuario y tenant y rechaza accesos inválidos.
- Permisos — `src/api/middlewares/auth/permissionAuthorization.middleware.ts:permissionAuthorization(requiredPermissions)`: exige permisos definidos en `src/api/constants/permissions.ts`.
- Roles — `src/api/middlewares/auth/roleAuthorization.middleware.ts:roleAuthorization()`: autorización por roles; aparece menos usado que permisos granulares.
- Passport — `src/api/config/passport/passport.ts`: `requireAuth` y `handleAuthError` integran estrategias y errores de autenticación.
- Webhook tenant — `extractTenantFromParams` en el flujo de registro evita depender del dominio para llamadas server-to-server.
- Validación — cadenas en `src/api/validators/` más `trim-request`; helpers `paramsValidator()` y `validateField()` centralizan express-validator.
- Errores — `src/api/middlewares/error/` y `Server.setupErrorHandling()` normalizan la salida.

Patrón predominante: `origin.checkDomain → origin.checkTenant → auth → permissionAuthorization → validadores → trimRequest → controlador`. Los endpoints públicos omiten `auth`; el webhook omite deliberadamente `checkDomain` y extrae tenant desde parámetros.

## 8. Dependencias entre archivos, clases y funciones

- `src/app.ts:bootstrap()` llama `DatabaseConnection.connect()`, construye/arranca `Server` y llama `setupGracefulShutdown()`.
- `Server.setupRoutes()` depende de `RouteLoader.loadRoutes()` y `env.API_PREFIX`.
- Cada router crea una instancia de controlador; cada controlador crea sus servicios en el constructor. No se observa contenedor de inyección de dependencias.
- Los servicios dependen de modelos Mongoose y del helper genérico `src/api/utils/database.helper.ts:DatabaseHelper`; sus métodos `findById`, `create` y `update` son hotspots con fan-in 17, 14 y 10.
- `apiResponse.error()` y `apiResponse.success()` tienen fan-in 50 y 33, por lo que son dependencias transversales críticas.
- `permissionAuthorization()` tiene fan-in 9 y es la frontera de autorización principal.
- El dominio de competición expone funciones puras desde `src/api/domain/championship/competition/index.ts`; `GroupDistributionService` integra `distributeTeamsIntoGroups()` y los mappers con persistencia.
- Motores encadenables: `distributeTeamsIntoGroups()` → `generateFixtureForGroups()` → `scheduleMatchesOnCourts()` → `applyMatchResult()` → `calculateStandingsByGroup()` → `qualifyTeamsFromGroupStandings()` → `generateEliminationBracket()` → `advanceBracketMatchWinner()`.

El grafo contiene 541 importaciones, 630 llamadas y 685 usos. No detectó ciclos de importación explícitos como tipo de arista, pero la carga dinámica y los barrel files reducen la precisión de este análisis; no se afirma que no exista ningún ciclo en tiempo de ejecución.

## 9. Flujo completo de una petición

Ejemplo real: crear un campeonato.

1. `Server.setupRoutes()` monta `RouteLoader.loadRoutes()` bajo `API_PREFIX`.
2. `RouteLoader.loadRouteFile()` monta `src/api/routes/championship/championship.ts` bajo `/championship`.
3. `POST /api/v1/championship/` pasa por `origin.checkDomain`, `origin.checkTenant`, `auth`, `permissionAuthorization([CHAMPIONSHIP_CREATE])`, `validateCreateChampionship`, `validateCreateChampionshipConfiguration` y `trimRequest.all`.
4. Se ejecuta `ChampionshipController.create()` (`src/api/controllers/championship/championship.controller.ts:26`).
5. El controlador usa `ChampionshipService` y `ConfigurationService`.
6. Los servicios validan y persisten mediante modelos Mongoose de `championship/championship.ts` y `championship/configuration.ts`, apoyados por `DatabaseHelper`.
7. El controlador responde mediante `apiResponse.success()`; errores pasan a `apiResponse.error()`/middleware global.

Flujo deportivo actualmente comprobable desde servicio/dominio: `POST groupDistribution/...` → tenant/auth/permiso/validadores → `groupDistribution.autoCreateGroupDistribution()` → `GroupDistributionService.createGroupDistribution()` → motor `distributeTeamsIntoGroups()` → `competition.mapper.ts` → modelo `groupsDistrubution.ts`.

## 10. Riesgos arquitectónicos y deuda

1. **Duplicación de inscripciones:** existen `src/api/services/championship/register.service.ts` y `registration.service.ts`, ambos con clase `RegistrationService`; `validateInitialRegistration`, `updateRegistrationStatus` y `getPaymentDetails` aparecen duplicados/similares. Riesgo alto de divergencia.
2. **Controladores/servicios construidos directamente:** los constructores acoplan HTTP a implementaciones concretas y dificultan unit tests, transacciones y sustitución de repositorios.
3. **Helper de base de datos central:** `DatabaseHelper` concentra muchas operaciones y alto fan-in. Cambios allí impactan gran parte de la aplicación; `update()` tiene complejidad ciclomática 8/cognitiva 22.
4. **Complejidad en distribución:** `GroupDistributionService.createGroupDistribution()` tiene complejidad 14, cognitiva 26 y profundidad transitoria de bucles 4; mezcla validación, mapeo, algoritmo y persistencia.
5. **Webhook complejo:** `RegistrationController.handlePaymentWebhook()` tiene complejidad 9/cognitiva 18 y lógica de negocio en controlador.
6. **Tenant middleware complejo:** `auth()` y `checkTenant()` tienen complejidad/cognitiva 7/15; cualquier fallo puede romper aislamiento multi-tenant.
7. **Rutas por reflexión del filesystem:** `RouteLoader` depende de nombres de carpetas y `require` dinámico; vuelve implícito el contrato público y dificulta análisis estático, versionado y pruebas de endpoints.
8. **Código similar:** operaciones add/delete/update de IDs en `ChampionshipService`, métodos de invitación, validadores de URLs y métodos de configuración/controladores muestran similitud muy alta. Parte es patrón CRUD legítimo, pero conviene extraer primitivas seguras.
9. **Duplicación de nomenclatura/typos:** `groupsDistrubution.ts`, `QueryPatams.helper.ts`, `teams.validatos`, `strcuture.md`, nombres de clases en minúscula y rutas con carpeta `invitationlinkroutes.ts` aumentan fricción y riesgo de importaciones inconsistentes.
10. **Dominio deportivo desconectado:** los motores están cohesionados y probados manualmente, pero fixture, programación, resultados, standings y bracket carecen de una fachada de aplicación/persistencia/endpoints completos.
11. **Pruebas mayormente manuales:** numerosos archivos `*.manual.ts`; falta una suite automatizada integral para flujos, tenant, permisos y concurrencia de resultados.
12. **Ciclos:** no se encontraron ciclos confirmados en las relaciones disponibles. La carga dinámica y barrels impiden descartar ciclos ocultos; debe validarse con una regla estática en CI.

## 11. Archivos relevantes para competición

### Distribución de grupos

- `src/api/domain/championship/competition/groupDistribution.engine.ts`: `distributeTeamsIntoGroups`, `calculateGroupPlan`, `createEmptyGroups`, `distributeBalancedByClub`, `detectSameClubWarnings`.
- `src/api/services/championship/groupDistribution.service.ts`: `GroupDistributionService.createGroupDistribution`, `mapFormatTypeToDistributionStrategy`.
- `src/api/domain/championship/competition/competition.mapper.ts`: mapeo dominio/Mongo.
- `src/api/models/mongoose/championship/groupsDistrubution.ts` y `group.ts`.
- `src/api/controllers/championship/groupDistribution.controller.ts` y `src/api/routes/groupDistribution/groupDistribution.ts`.

### Fixture y programación de partidos

- `fixtureGenerator.engine.ts`: `generateFixtureForGroups`, `generateRoundRobinMatchesForGroup`, `calculateExpectedMatchesForGroup(s)`.
- `courtScheduler.engine.ts`: `scheduleMatchesOnCourts`, `reorderMatchesAvoidingBackToBack`.
- `bracket.engine.ts`: `generateEliminationBracket`, `generateNextRounds`, `linkBracketMatches`.
- `bracketProgression.engine.ts`: `advanceBracketMatchWinner`, `advanceBracketMatchWinnerByStoredWinner`.
- Persistencia relacionada: `models/mongoose/championship/match.ts`, `phase.ts`, `court.ts`.

### Resultados y posiciones

- `matchResult.engine.ts`: `getDefaultRulesByVolleyballType`, `calculateMatchResult`, `applyMatchResult`.
- `standing.engine.ts`: `calculateStandingsFromMatches`, `calculateStandingsByGroup`, `applyMatchToStandings`, `compareStandings`.
- `qualification.engine.ts`: `qualifyTeamsFromGroupStandings` y estrategias de clasificación.
- `models/mongoose/championship/statistics.ts` y `match.ts`.
- Prueba de flujo: `src/test/competitionFlow.manual.ts`; pruebas específicas `fixtureGenerator.manual.ts`, `courtScheduler.manual.ts`, `matchResult.manual.ts`, `standings.manual.ts`, `qualification.manual.ts`, `bracket.manual.ts` y `bracketProgression.manual.ts`.

## 12. Funcionalidades incompletas o provisionales

- `src/api/routes/auth/auth.ts`: TODO para login con Google/Facebook.
- `src/api/routes/authSocial/socialAuth.ts`: rutas sociales marcadas “Pending Production Setup” y Facebook completamente comentado.
- `src/api/routes/plugins/plugins.ts`: CRUD, activación/desactivación, eventos y endpoint público comentados; solo listado está activo.
- Las constantes de campeonato declaran fases/partidos (`/:id/phases/.../matches`) sin endpoints activos equivalentes documentables.
- `src/api/routes/match/match.ts` existe sin exposición activa detectada; los motores de resultado, standings, clasificación y bracket no están conectados a controladores/rutas productivas completas.
- `src/api/routes/position/position.ts` contiene más capacidad declarada que la exposición detectada con certeza en el índice; requiere cerrar/automatizar el contrato.
- Hay dos implementaciones de `RegistrationService`, señal de migración o refactor incompleto.
- Los archivos `*.manual.ts` y el prototipo `src/test/Untitled-1.html` son verificaciones/prototipos, no una suite automatizada de producción.
- El índice encontró marcadores TODO/FIXME y bloques provisionales también en documentación de auditoría; se priorizaron aquí los que afectan código ejecutable.

## Próximos cinco pasos recomendados

1. Consolidar los dos `RegistrationService` en un único caso de uso y mover la lógica del webhook fuera del controlador, cubriéndola con tests idempotentes.
2. Crear una fachada `CompetitionService`/repositorios que orqueste los motores puros y persista fixture, resultados, tabla y bracket dentro de una transacción o estrategia idempotente.
3. Definir explícitamente y probar los endpoints faltantes de partidos, resultados, standings, clasificación y progresión; reemplazar el contrato implícito del cargador dinámico por un registro de rutas verificable.
4. Añadir pruebas automatizadas de integración para aislamiento tenant, autenticación/permisos y el flujo completo campeonato → grupos → fixture → resultados → tabla → bracket.
5. Reducir los hotspots (`GroupDistributionService.createGroupDistribution`, webhook, `DatabaseHelper.update`, `auth/checkTenant`) separando validación, repositorio y dominio; añadir detección de ciclos y límites de complejidad en CI.
