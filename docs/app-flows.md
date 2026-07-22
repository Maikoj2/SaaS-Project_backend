# App Flows — Volleyball Championship SaaS

Este documento describe los principales flujos funcionales de la aplicación de campeonatos de voleibol. Sirve como mapa para backend, frontend, pruebas, documentación y futuras mejoras.

---

# 1. Flujo — Crear campeonato

```txt
Organizador inicia sesión
→ backend valida token y tenant
→ organizador envía datos del campeonato
→ backend crea Championship
→ backend crea ChampionshipConfiguration
→ se asignan reglas predefinidas de competencia
→ se configuran reglas de partido
→ se configuran reglas de tabla de puntos
→ se configuran reglas de clasificación/eliminatorias
→ campeonato queda en estado draft o activo
```

## Datos principales

```txt
name
description
championshipType
startDate
endDate
status
maxTeams
registrationDeadline
registrationFee
gameFormatId
matchRules
tablePointsPolicy
tieBreakerCriteria
distributionStrategy
eliminationSettings
competitionRulePreset
competitionRules
```

## Resultado esperado

```txt
Championship creado
ChampionshipConfiguration creada
Reglas deportivas asociadas al campeonato
```

---

# 2. Flujo — Configuración deportiva del campeonato

```txt
Organizador selecciona preset de competencia
→ backend obtiene reglas predefinidas
→ backend guarda competitionRulePreset
→ backend guarda copia de competitionRules
→ configuración queda lista para validar equipos y jugadores
```

## Ejemplos de presets

```txt
BEACH_OPEN_2V2
BEACH_MALE_2V2
BEACH_FEMALE_2V2
BEACH_MIXED_2V2
INDOOR_OPEN_6V6
INDOOR_MALE_6V6
INDOOR_FEMALE_6V6
INDOOR_MIXED_6V6
```

## Reglas que controla

```txt
Tipo de torneo: masculino, femenino, mixto o libre
Cantidad mínima de jugadores
Cantidad máxima de jugadores
Cantidad de titulares
Reglas mixtas
Categorías
Edad mínima/máxima
Cupos por categoría
```

---

# 3. Flujo — Generar link público de inscripción

```txt
Organizador entra al campeonato
→ solicita generar link de inscripción
→ backend valida campeonato
→ backend valida tenant
→ backend crea InvitationLink
→ backend genera code único
→ backend define maxUses
→ backend define expiresAt
→ backend retorna URL pública
→ organizador comparte el link
```

## Endpoint base

```http
POST /api/v1/invitationlink/championships/:championshipId/invitation
```

## Resultado esperado

```json
{
  "invitationLink": "http://localhost:8000/api/v1/championships/:championshipId/register?code=CODE",
  "expiresAt": "2026-07-29T00:00:00.000Z",
  "code": "CODE"
}
```

## Entidad afectada

```txt
InvitationLink
```

---

# 4. Flujo — Validar uso de link de invitación

```txt
Usuario externo recibe link
→ frontend extrae code de la URL
→ frontend consulta backend
→ backend busca InvitationLink
→ backend valida que exista
→ backend valida que esté activo
→ backend valida fecha de expiración
→ backend valida límite de usos
→ backend retorna championshipId
```

## Endpoint base

```http
POST /api/v1/invitationlink/championships/invitation/use
```

## Body

```json
{
  "code": "CODE"
}
```

## Resultado esperado

```txt
Link válido
ChampionshipId identificado
Inscripción permitida
```

---

# 5. Flujo — Registro público completo de equipo

```txt
Jugador abre link público
→ frontend muestra formulario de equipo y jugadores
→ usuario envía team, players y payerData
→ backend valida code de invitación
→ backend valida configuración del campeonato
→ backend valida competitionRules
→ backend valida cantidad de jugadores
→ backend valida género si es mixto
→ backend valida categoría si aplica
→ backend valida que el equipo no exista
→ backend valida que emails/NIE no estén duplicados
→ backend crea User por cada jugador
→ backend genera password temporal
→ backend guarda password hasheada
→ backend marca verified true
→ backend marca mustChangePassword true
→ backend crea Player asociado a cada User
→ backend crea Team con players[]
→ backend define captainId
→ backend crea Registration pendiente
→ backend asocia Registration al Team
→ backend genera link de pago
→ backend incrementa usedCount del InvitationLink
→ backend envía email con contraseña temporal
→ backend retorna team, players, registration y paymentUrl
```

## Endpoint base

```http
POST /api/v1/register/public/:code/team
```

## Body ejemplo

```json
{
  "team": {
    "name": "Águilas de Arena",
    "categoryId": "mixed-open",
    "captainEmail": "carlos@test.com",
    "logo": "teams/aguilas_arena_logo.png"
  },
  "players": [
    {
      "name": "Carlos",
      "lastName": "Pérez",
      "email": "carlos@test.com",
      "nie": "123456789",
      "phone": "3001234567",
      "gender": "male",
      "dateOfBirth": "2000-03-10",
      "position": "BLOCKER",
      "eps": "sura",
      "number": 7
    },
    {
      "name": "Laura",
      "lastName": "Gómez",
      "email": "laura@test.com",
      "nie": "987654321",
      "phone": "3014567890",
      "gender": "female",
      "dateOfBirth": "2001-07-12",
      "position": "DEFENDER",
      "eps": "sura",
      "number": 10
    }
  ],
  "payerData": {
    "name": "Carlos Pérez",
    "email": "carlos@test.com",
    "phone": "3001234567",
    "areaCode": "57"
  }
}
```

## Entidades creadas

```txt
User
Player
Team
Registration
Payment preference / MercadoPago
```

## Estados iniciales

```txt
User.verified = true
User.mustChangePassword = true
User.role = team_member
Player.status = active
Team.status = pending
Registration.registrationStatus = pending
Registration.feePaid = false
```

---

# 6. Flujo — Enviar contraseña temporal por correo

```txt
Backend crea usuario jugador
→ backend genera contraseña temporal
→ backend guarda contraseña hasheada
→ backend guarda credencial temporal solo en memoria
→ backend llama EmailService
→ EmailService envía o simula email
→ jugador recibe email con acceso temporal
```

## Email esperado

```txt
Hola Carlos,
tu cuenta fue creada correctamente.

Email: carlos@test.com
Contraseña temporal: ********

Debes iniciar sesión y cambiar tu contraseña.
```

## Seguridad

```txt
No devolver contraseña temporal en producción
No guardar contraseña temporal en texto plano
Guardar solo password hasheada
Usar mustChangePassword para forzar cambio
```

---

# 7. Flujo — Login con contraseña temporal

```txt
Jugador recibe email
→ entra al login
→ ingresa email y contraseña temporal
→ backend valida credenciales
→ backend genera token
→ backend retorna user
→ login devuelve mustChangePassword true
→ frontend detecta cambio obligatorio
→ frontend redirige a pantalla de cambio de contraseña
```

## Respuesta esperada

```json
{
  "token": "...",
  "user": {
    "_id": "...",
    "name": "Carlos",
    "email": "carlos@test.com",
    "role": "team_member",
    "mustChangePassword": true
  }
}
```

---

# 8. Flujo — Cambio obligatorio de contraseña temporal

```txt
Jugador inicia sesión con contraseña temporal
→ login devuelve mustChangePassword: true
→ frontend lo manda a cambiar contraseña
→ jugador envía contraseña actual y nueva contraseña
→ backend valida token
→ backend obtiene user autenticado
→ backend busca usuario con password seleccionado
→ backend valida contraseña actual
→ backend valida que nueva contraseña sea diferente
→ backend hashea nueva contraseña
→ backend guarda nueva contraseña
→ backend cambia mustChangePassword a false
→ frontend permite continuar
```

## Endpoint base

```http
PATCH /api/v1/auth/change-temporary-password
```

## Body

```json
{
  "currentPassword": "Temporal123",
  "newPassword": "NuevaClave123"
}
```

## Resultado esperado

```json
{
  "userId": "...",
  "email": "carlos@test.com",
  "mustChangePassword": false
}
```

---

# 9. Flujo — Consultar equipos inscritos

```txt
Organizador inicia sesión
→ frontend solicita equipos del campeonato
→ backend valida token y permiso
→ backend busca Teams por championshipId
→ backend popula players, captainId y registrations
→ backend retorna lista paginada
```

## Endpoint base

```http
GET /api/v1/team/championships/:championshipId/teams
```

## Filtros

```txt
status
search
page
limit
```

## Resultado esperado

```txt
Lista de equipos inscritos en el campeonato
```

---

# 10. Flujo — Consultar detalle de equipo

```txt
Organizador o usuario autorizado solicita detalle
→ backend valida tenant
→ backend valida permiso
→ backend busca Team por championshipId y teamId
→ backend popula players
→ backend popula captainId
→ backend popula registrations
→ backend retorna detalle
```

## Endpoint base

```http
GET /api/v1/team/championships/:championshipId/teams/:teamId
```

---

# 11. Flujo — Crear equipo manualmente por organizador

```txt
Organizador inicia sesión
→ abre campeonato
→ crea equipo manualmente
→ backend valida permiso TEAM_CREATE
→ backend valida championshipId
→ backend valida datos del equipo
→ backend valida jugadores existentes o crea jugadores
→ backend crea Team
→ backend asocia Team al Championship
→ backend puede crear Registration manual o marcar inscripción directa
```

## Endpoint recomendado

```http
POST /api/v1/team/championships/:championshipId/teams
```

## Diferencia con registro público

```txt
Registro público usa link y code
Registro manual usa token y permiso de organizador
Registro público genera usuarios y pago
Registro manual puede omitir pago o marcarlo como manual
```

---

# 12. Flujo — Editar equipo

```txt
Organizador inicia sesión
→ selecciona equipo
→ modifica nombre, logo, categoría, estado o jugadores
→ backend valida permiso TEAM_UPDATE
→ backend valida campeonato
→ backend valida que equipo exista
→ backend actualiza Team
→ backend retorna equipo actualizado
```

## Endpoint recomendado

```http
PATCH /api/v1/team/championships/:championshipId/teams/:teamId
```

## Campos editables

```txt
name
logo
categoryId
captainId
players
status
```

---

# 13. Flujo — Generar distribución de grupos

```txt
Organizador revisa equipos inscritos
→ selecciona generar grupos
→ backend valida championshipId
→ backend valida configuración
→ backend valida cantidad de equipos
→ backend valida maxTeams
→ backend valida que no exista distribución activa duplicada
→ backend aplica distributionStrategy
→ backend crea GroupDistribution
→ backend crea Groups
→ backend asigna Teams a Groups
→ backend retorna distribución
```

## Endpoint base

```http
POST /api/v1/groupDistribution/championships/:championshipId/group-distributions
```

## Estrategias

```txt
serpentine
linear
random
balancedByClub
custom
```

## Entidades afectadas

```txt
GroupDistribution
Group
Team
```

---

# 14. Flujo — Consultar distribuciones de grupos

```txt
Frontend solicita distribuciones de un campeonato
→ backend valida permiso
→ backend busca GroupDistribution por championshipId
→ backend aplica filtros
→ backend retorna lista paginada
```

## Endpoint base

```http
GET /api/v1/groupDistribution/championships/:championshipId/group-distributions
```

## Filtros

```txt
status
formatType
page
limit
```

---

# 15. Flujo — Consultar detalle de distribución

```txt
Frontend solicita una distribución específica
→ backend valida championshipId
→ backend valida groupDistributionId
→ backend busca GroupDistribution
→ backend retorna distribución completa
```

## Endpoint base

```http
GET /api/v1/groupDistribution/championships/:championshipId/group-distributions/:groupDistributionId
```

---

# 16. Flujo — Consultar grupos

```txt
Frontend solicita grupos del campeonato
→ backend valida permiso GROUP_READ
→ backend busca Groups por championshipId
→ backend popula teams
→ backend popula matches
→ backend popula rankings.teamId
→ backend retorna grupos
```

## Endpoints base

```http
GET /api/v1/group/championships/:championshipId/groups
GET /api/v1/group/championships/:championshipId/groups/:groupId
GET /api/v1/group/championships/:championshipId/groups/:groupId/standings
GET /api/v1/group/group-distributions/:groupDistributionId/groups
```

---

# 17. Flujo — Generar fixture / partidos de fase de grupos

```txt
Organizador genera fixture
→ backend lee GroupDistribution
→ backend lee Groups
→ backend lee Teams por grupo
→ backend aplica formato round-robin
→ backend valida canchas disponibles
→ backend asigna números de partido
→ backend asigna grupo
→ backend crea Matches
→ backend agrega matches a cada Group
→ partidos quedan scheduled
```

## Entidades afectadas

```txt
Match
Group
Court
GameFormat
```

---

# 18. Flujo — Consultar partidos

```txt
Frontend solicita partidos
→ backend valida permiso MATCH_READ
→ backend filtra por championshipId
→ backend permite filtrar por groupId
→ backend permite filtrar por eliminationBracketId
→ backend permite filtrar por status
→ backend popula homeTeamId
→ backend popula awayTeamId
→ backend popula groupId
→ backend popula courtId
→ backend retorna partidos
```

## Endpoints base

```http
GET /api/v1/match/championships/:championshipId/matches
GET /api/v1/match/championships/:championshipId/matches/:matchId
GET /api/v1/match/championships/:championshipId/groups/:groupId/matches
GET /api/v1/match/championships/:championshipId/elimination-brackets/:eliminationBracketId/matches
```

---

# 19. Flujo — Registrar resultado de partido de grupo

```txt
Árbitro o juez inicia sesión
→ selecciona partido
→ envía resultado por sets o WO
→ backend valida permiso
→ backend valida matchId
→ backend valida que el partido pertenezca al tenant
→ backend valida reglas de sets
→ backend valida puntos máximos/mínimos
→ backend calcula ganador
→ backend actualiza Match
→ backend recalcula standings del Group
→ backend actualiza rankings
→ backend retorna match actualizado y standings
```

## Endpoint base

```http
POST /api/v1/match/:matchId/result
```

## Estados posibles

```txt
scheduled
in_progress
finished
walkover
cancelled
```

---

# 20. Flujo — Tabla de posiciones / standings

```txt
Resultado de partido cambia
→ backend obtiene todos los partidos del grupo
→ backend calcula partidos jugados
→ backend calcula ganados/perdidos
→ backend calcula walkovers
→ backend calcula sets a favor/en contra
→ backend calcula ratio de sets
→ backend calcula puntos a favor/en contra
→ backend calcula ratio de puntos
→ backend aplica tablePointsPolicy
→ backend ordena por tieBreakerCriteria
→ backend guarda rankings en Group
```

## Criterios

```txt
points
won
setRatio
pointRatio
draw
```

---

# 21. Flujo — Clasificación a eliminatorias

```txt
Fase de grupos termina
→ organizador solicita generar eliminatorias
→ backend valida que todos los partidos de grupos estén terminados
→ backend lee standings
→ backend lee ChampionshipConfiguration
→ backend lee eliminationSettings
→ backend calcula clasificados
→ backend aplica qualificationMode
→ backend aplica tieBreakerCriteria
→ backend calcula seeds
```

## Modos de clasificación

```txt
topPerGroup
topPerGroupPlusBestThirds
topPerGroupPlusBestRemaining
bestOverall
```

---

# 22. Flujo — Generar bracket eliminatorio

```txt
Backend recibe clasificados
→ valida bracketSize
→ valida cantidad de clasificados
→ aplica bracketSeedingStrategy
→ genera bracket
→ crea EliminationBracket
→ crea partidos reales de primera ronda
→ asocia partidos al bracket
→ retorna bracket generado
```

## Endpoint base

```http
POST /api/v1/elimination/championships/:championshipId/group-distributions/:groupDistributionId/elimination-bracket
```

## Estrategias

```txt
overallRanking
crossGroup
manual
random
```

---

# 23. Flujo — Consultar bracket eliminatorio

```txt
Frontend solicita bracket activo
→ backend valida campeonato
→ backend busca EliminationBracket active/draft
→ backend popula matches
→ backend retorna bracket
```

## Endpoints base

```http
GET /api/v1/elimination/championships/:championshipId/elimination-bracket/active
GET /api/v1/elimination/championships/:championshipId/elimination-brackets
GET /api/v1/elimination/championships/:championshipId/elimination-brackets/:eliminationBracketId
```

---

# 24. Flujo — Registrar resultado eliminatorio

```txt
Árbitro registra resultado de partido eliminatorio
→ backend valida match
→ backend detecta isEliminationMatch
→ backend actualiza resultado
→ backend calcula ganador
→ backend busca EliminationBracket
→ backend avanza ganador en bracket
→ backend avanza perdedor si hay tercer puesto
→ backend crea nuevos partidos si ambos equipos están listos
→ backend actualiza bracket
→ si final termina, bracket queda completed
```

## Entidades afectadas

```txt
Match
EliminationBracket
Team
```

---

# 25. Flujo — Finalizar campeonato

```txt
Final termina
→ backend detecta bracket completed
→ backend identifica campeón
→ backend identifica subcampeón
→ backend identifica tercer lugar si aplica
→ backend puede actualizar Championship status a completed
→ backend puede guardar resumen final
→ frontend muestra podio
```

## Resultado esperado

```txt
Champion
Runner-up
Third place
Fourth place
```

---

# 26. Flujo — Pago de inscripción con MercadoPago

```txt
Registro crea Registration pendiente
→ backend genera preference/payment link
→ usuario abre paymentUrl
→ MercadoPago procesa pago
→ MercadoPago llama webhook
→ backend valida tenant
→ backend valida registrationId
→ backend consulta payment details
→ backend valida metadata
→ backend confirma pago si approved
→ backend actualiza Registration
```

## Estados

```txt
pending
confirmed
rejected
```

## Campos actualizados

```txt
registrationStatus
feePaid
paymentDate
transactionId
```

---

# 27. Flujo — Webhook MercadoPago

```txt
MercadoPago envía webhook
→ backend recibe tenantId y registrationId desde ruta
→ backend identifica topic/type/action
→ backend obtiene paymentId
→ backend ignora eventos que no sean payment
→ backend consulta detalle del pago
→ backend valida metadata tenant_id
→ backend valida metadata purchase_id
→ si status approved, confirma Registration
→ backend responde 200 siempre
```

## Endpoint base

```http
POST /api/v1/register/webhook/:tenantId/:id
```

---

# 28. Flujo — Roles y permisos

```txt
Usuario inicia sesión
→ backend genera token con role
→ request entra a ruta protegida
→ auth valida token
→ checkTenant valida tenant
→ permissionAuthorization valida permiso
→ si tiene permiso, continúa
→ si no tiene permiso, retorna error
```

## Roles principales

```txt
admin
organizer
referee
team_member
viewer
```

## Ejemplos de permisos

```txt
TEAM_READ
TEAM_CREATE
TEAM_UPDATE
MATCH_READ
MATCH_RESULT_REGISTER
GROUP_READ
GROUP_DISTRIBUTION_READ
INVITATION_LINK_CREATE
INVITATION_LINK_READ
INVITATION_LINK_MANAGE
```

---

# 29. Flujo — Multi-tenant

```txt
Request entra al backend
→ origin.checkDomain valida dominio
→ origin.checkTenant obtiene tenant
→ req.clientAccount recibe tenant
→ DatabaseHelper usa tenant
→ modelo usa byTenant
→ consulta queda aislada por tenantId
```

## Regla principal

```txt
Nunca consultar modelos tenant-owned sin tenant.
```

---

# 30. Flujo — Rollback en inscripción pública

```txt
Backend empieza registro público
→ crea users
→ crea players
→ crea team
→ crea registration
→ intenta generar pago
→ si algo falla:
    → elimina registration
    → elimina team
    → elimina players
    → elimina users
→ retorna error controlado
```

## Objetivo

```txt
Evitar datos huérfanos
Evitar usuarios sin player
Evitar team sin registration
Evitar registration sin pago
```

---

# 31. Flujo — Validaciones de inscripción

```txt
Request entra al endpoint público
→ validator revisa code
→ validator revisa team.name
→ validator revisa players[]
→ validator revisa email
→ validator revisa gender
→ validator revisa position
→ validator revisa eps
→ validator revisa payerData
→ service valida reglas de negocio
```

## Validaciones de middleware

```txt
Campos requeridos
Formato de email
Formato de fecha
Valores enum
Longitudes
MongoId cuando aplica
```

## Validaciones de service

```txt
Link activo
Link no expirado
Link no excede maxUses
Team name no duplicado
Email no duplicado
NIE no duplicado
Cantidad de jugadores válida
Género válido para torneo mixto
Categoría válida
Registration deadline vigente
```

---

# 32. Flujo — Estados principales

## Championship

```txt
draft
active
completed
cancelled
```

## Team

```txt
pending
active
inactive
rejected
```

## Registration

```txt
pending
confirmed
rejected
```

## Match

```txt
scheduled
in_progress
finished
walkover
cancelled
```

## EliminationBracket

```txt
draft
active
completed
archived
```

## InvitationLink

```txt
isActive true
isActive false
expired
maxUses reached
```

---

# 33. Flujo — Próximos pendientes

```txt
Crear equipo manual por organizador
Editar equipo
Aprobar/rechazar equipo
Crear jugadores manualmente
Actualizar jugadores
Enviar email real con nodemailer o provider
Pantalla frontend para cambio de contraseña
Validar acceso bloqueado si mustChangePassword true
Gestión de canchas
Asignación de horarios
Asignación de árbitros
Notificaciones
Dashboard del campeonato
```

---

# Resumen general del sistema

```txt
Admin/organizador crea campeonato
→ configura reglas
→ genera link público
→ equipos se registran
→ usuarios y jugadores se crean automáticamente
→ se genera pago
→ se confirma inscripción
→ organizador genera grupos
→ se generan partidos
→ árbitros registran resultados
→ standings se actualizan
→ clasificados pasan a eliminatorias
→ bracket avanza automáticamente
→ se define campeón
```
