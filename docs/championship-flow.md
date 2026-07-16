# Flujo técnico del módulo de campeonatos

## 1. Alcance y objetivo

Este documento describe el flujo implementado para campeonatos de voleibol de playa (`beach`) y piso (`indoor`): creación y configuración, posicionamiento de equipos, distribución en grupos, fixture, registro de resultados, standings, clasificación y generación del bracket eliminatorio.

La arquitectura separa tres responsabilidades:

- **Persistencia MongoDB/Mongoose:** `Championship`, `ChampionshipConfiguration`, `GroupDistribution`, `Group`, `Match`, `GameFormat` y `Court`.
- **Servicios de aplicación:** coordinan tenant, consultas, persistencia y engines de dominio.
- **Engines de dominio:** calculan distribución, fixture, resultados, standings, clasificados y bracket sin depender directamente de Express o MongoDB.

El tenant no debe llegar en el body. Los controllers lo obtienen desde `req.clientAccount`, después de `origin.checkDomain` y `origin.checkTenant`; por tanto, debe resolverse mediante el dominio, subdominio o headers definidos por la infraestructura actual.

## 2. Archivos principales

| Responsabilidad | Archivo |
|---|---|
| Campeonato | `src/api/models/mongoose/championship/championship.ts` |
| Configuración | `src/api/models/mongoose/championship/configuration.ts` |
| Formato de juego | `src/api/models/mongoose/championship/gameFormat.ts` |
| Canchas | `src/api/models/mongoose/championship/court.ts` |
| Distribución persistida | `src/api/models/mongoose/championship/groupsDistrubution.ts` |
| Grupo y rankings | `src/api/models/mongoose/championship/group.ts` |
| Partido y score | `src/api/models/mongoose/championship/match.ts` |
| Distribución de dominio | `src/api/domain/championship/competition/groupDistribution.engine.ts` |
| Fixture round-robin | `src/api/domain/championship/competition/fixtureGenerator.engine.ts` |
| Programación en canchas | `src/api/domain/championship/competition/courtScheduler.engine.ts` |
| Resultado de partido | `src/api/domain/championship/competition/matchResult.engine.ts` |
| Standings | `src/api/domain/championship/competition/standing.engine.ts` |
| Clasificación | `src/api/domain/championship/competition/qualification.engine.ts` |
| Bracket | `src/api/domain/championship/competition/bracket.engine.ts` |
| Avance de bracket | `src/api/domain/championship/competition/bracketProgression.engine.ts` |
| Orquestación de grupos | `src/api/services/championship/groupDistribution.service.ts` |
| Registro de resultados | `src/api/services/championship/match.service.ts` |
| Generación eliminatoria | `src/api/services/championship/eliminatination.service.ts` |

> Nota: `groupsDistrubution.ts` y `eliminatination.service.ts` contienen errores ortográficos en sus nombres, pero esos son los paths reales actuales.

## 3. Flujo general

1. Se crea el `Championship` y su `ChampionshipConfiguration`.
2. Se registran equipos y se generan posiciones/seeds en `Position`.
3. Se solicita una distribución de grupos.
4. El backend lee las posiciones, toma la estrategia desde la configuración y calcula los grupos.
5. El backend persiste `GroupDistribution`, crea documentos `Group` y genera todos los partidos round-robin como `Match` con status `scheduled`.
6. Opcionalmente asigna canchas y horarios.
7. El front registra sets o un walkover por partido.
8. El backend valida el resultado, calcula ganador y score, actualiza `Match` y recalcula `Group.rankings`.
9. Al finalizar la fase de grupos, el backend lee rankings, aplica `eliminationSettings`, obtiene clasificados y seeds.
10. El backend genera el bracket. Actualmente lo devuelve en la respuesta, pero no lo persiste ni crea los partidos eliminatorios.

## 4. Responsabilidad del front y del backend

### El front/Postman puede enviar

- Datos iniciales del campeonato y su configuración.
- `matchRules`, `tablePointsPolicy`, `tieBreakerCriteria` y `eliminationSettings`.
- Parámetros de distribución como número de grupos, preferencia de tamaño y estrategia.
- Datos opcionales de programación en canchas.
- Puntuación de cada set de un partido.
- El identificador del ganador por walkover.

### El front/Postman no debería enviar

- `tenant` en el body.
- `winnerId` de un resultado normal.
- Score final de sets ganados.
- Status final `finished` o `walkover`.
- Rankings manuales de los grupos.
- Ratios, posiciones, clasificados, `overallPosition` o seeds finales.
- Estructura del bracket calculada manualmente.

Estos valores deben ser derivados y validados por el backend para mantener una única fuente de verdad.

## 5. Configuración del campeonato

`ChampionshipConfiguration` relaciona un campeonato con reglas deportivas y operativas.

### Campos principales

| Campo | Uso |
|---|---|
| `championshipId` | Campeonato propietario de la configuración. |
| `maxTeams` | Límite de equipos. |
| `gameFormatId` | Referencia al formato de juego. |
| `distributionStrategy` | `serpentine`, `linear`, `random` o `balancedByClub`. |
| `matchRules` | Reglas que validan sets y resultados. |
| `tablePointsPolicy` | Puntos que alimentan los standings. |
| `tieBreakerCriteria` | Criterios configurables usados en clasificación general. |
| `eliminationSettings` | Clasificación y configuración de la fase eliminatoria. |
| `registrationDeadline` | Fecha límite futura. |
| `registrationFee` | Tarifa no negativa. |

### `matchRules`

| Campo | Significado | Default playa |
|---|---|---:|
| `volleyballType` | `beach` o `indoor`. | `beach` |
| `setsToWin` | Sets necesarios para ganar. | 2 |
| `maxSets` | Máximo de sets permitido. | 3 |
| `regularSetPoints` | Objetivo mínimo de un set normal. | 21 |
| `tieBreakPoints` | Objetivo mínimo del último set posible. | 15 |
| `minimumPointDifference` | Ventaja mínima para cerrar un set. | 2 |

El engine incluye defaults de piso: 3 sets para ganar, máximo 5, sets normales a 25, tie-break a 15 y diferencia mínima de 2.

La validación de resultados comprueba que haya sets, que no excedan `maxSets`, que estén numerados desde 1, que no empaten, que no tengan valores negativos, que alcancen el objetivo y que respeten la diferencia mínima. También exige que un equipo alcance exactamente la condición de victoria.

### `tablePointsPolicy`

| Campo | Efecto | Default |
|---|---|---:|
| `winPoints` | Puntos por victoria normal. | 2 |
| `lossPoints` | Puntos por derrota normal. | 1 |
| `walkoverLossPoints` | Puntos del perdedor por walkover. | 0 |
| `walkoverWinPoints` | Puntos del ganador por walkover; si falta, usa `winPoints`. | opcional |

### `eliminationSettings`

| Campo | Función |
|---|---|
| `enabled` | Habilita la etapa eliminatoria. |
| `qualificationMode` | Estrategia para seleccionar clasificados. |
| `topPerGroup` | Cupos directos por grupo. |
| `bestThirdsCount` | Cantidad de mejores terceros adicionales. |
| `totalQualifiers` | Total objetivo para modos globales o best remaining. |
| `normalizeStandingsForUnevenGroups` | Compara puntos y victorias por partido cuando los grupos tienen tamaños diferentes. |
| `bracketSeedingStrategy` | Configuración prevista: `overallRanking`, `crossGroup`, `manual` o `random`. |
| `bracketSize` | Tamaño permitido: 2, 4, 8, 16 o 32. |
| `includeThirdPlaceMatch` | Agrega partido por tercer puesto desde brackets de 4 o más. |
| `initialMatchNumber` | Número inicial de los partidos del bracket. |
| `autoGenerateAfterGroupStage` | Intención de generación automática; todavía no existe orquestación automática. |

Actualmente el servicio usa `qualificationMode`, cupos, normalización, desempates, `bracketSize`, tercer puesto y número inicial. `bracketSeedingStrategy` no altera todavía el algoritmo: el bracket utiliza el `overallPosition` calculado. `autoGenerateAfterGroupStage` tampoco está conectado a un evento o transición automática.

## 6. Distribución de equipos y creación de grupos

`GroupDistributionService.createGroupDistribution()` obtiene equipos desde `Position`, ordenados por `position`. No usa una lista libre enviada por el front.

Antes de crear valida:

- que existan equipos posicionados;
- que no haya otra distribución `draft` o `active` para el campeonato;
- límites de equipos, por defecto entre 8 y 32;
- al menos dos grupos y no más grupos que equipos;
- disponibilidad de canchas cuando se solicita scheduling.

### Estrategias

- `serpentine`: distribuye seeds en zigzag para equilibrar grupos.
- `linear`: distribuye por índice usando rotación entre grupos.
- `random`: mezcla equipos y luego aplica distribución lineal.
- `balancedByClub`: intenta colocar cada equipo en el grupo más pequeño que no tenga otro equipo del mismo club; puede devolver warnings.
- `manual`: está definido en dominio, pero lanza `Manual distribution is not implemented yet` y no está permitido por el endpoint actual.

### Plan automático de grupos

El engine contiene casos explícitos: 8→2, 9–11→3, 12→3 o 4, 13→4, 16→4, 20→5 salvo preferencia de grupos de 5, 24→6, 28→7 y 32→8. Para otros totales usa `ceil(totalTeams / maxTeamsPerGroup)`, con máximo preferido 4.

Los tamaños se balancean repartiendo el residuo en los primeros grupos. Por ejemplo, 22 equipos y 6 grupos generan `[4, 4, 4, 4, 3, 3]`.

Después del cálculo, el servicio persiste:

- un `GroupDistribution` con el mapa de equipos;
- un `Group` por cada grupo calculado;
- los `Match` correspondientes;
- los IDs de los partidos dentro de cada `Group`.

La operación completa no está envuelta actualmente en una transacción MongoDB.

## 7. Generación de partidos de grupos

`generateFixtureForGroups()` crea un round-robin simple. Para cada grupo genera todas las combinaciones únicas `teamA`–`teamB`:

```text
partidos = n × (n - 1) / 2
```

Un grupo de 4 produce 6 partidos y uno de 3 produce 3. Los documentos se crean con status `scheduled`, referencias al campeonato y grupo, y opcionalmente fase, cancha y formato.

`roundNumber` es hoy una aproximación (`teamBIndex - teamAIndex`), no un calendario round-robin por jornadas que garantice descansos adecuados.

Si `schedule.enabled` es verdadero, el backend toma canchas `available`, ejecuta `scheduleMatchesOnCourts()` y actualiza `courtId`, `startTime` y `endTime`.

## 8. Registro de resultados

### Resultado normal

El front envía exclusivamente los puntos de los sets. `MatchService` los convierte a `SetResult`, ejecuta `applyMatchResult()` y persiste:

- `score.homeTeam` y `score.awayTeam`: sets ganados;
- `score.periods`: puntos de cada set;
- `winnerId`: calculado;
- `status: finished`;
- `endTime`.

No se acepta sobrescribir un partido ya `finished` o `walkover`.

### Walkover

El requisito funcional puede llamarlo `walkoverTeamId`, pero el contrato implementado actualmente espera **`walkoverWinnerId`**. Debe contener el ID de uno de los dos equipos del partido.

El backend valida el ID, asigna status `walkover` y genera sets sintéticos. En playa, con los defaults, genera dos sets 21–0; en piso genera tres sets 25–0. El perdedor incrementa `WO` y recibe `walkoverLossPoints`.

## 9. Standings

Después de actualizar un partido, `MatchService.recalculateGroupStandings()` consulta los partidos del grupo cuyo status sea `finished` o `walkover`, los convierte al modelo de dominio y llama `calculateStandingsFromMatches()`.

| Campo de dominio | Campo persistido | Significado |
|---|---|---|
| `PTS` | `points` | Puntos de tabla. |
| `PJ` | `matchesPlayed` | Partidos jugados. |
| `PG` | `won` | Ganados. |
| `PP` | `lost` | Perdidos. |
| `WO` | `walkovers` | Derrotas por walkover. |
| `SF` | `setsFor` | Sets a favor. |
| `SC` | `setsAgainst` | Sets en contra. |
| `CS` | `setRatio` | `SF / SC`. |
| `TF` | `pointsFor` | Tantos/puntos de juego a favor. |
| `TC` | `pointsAgainst` | Tantos/puntos de juego en contra. |
| `CT` | `pointRatio` | `TF / TC`. |
| `POS` | `position` | Posición resultante. |

El orden interno actual de standings es fijo:

1. `PTS` descendente.
2. `CS` descendente.
3. `CT` descendente.
4. `PG` descendente.
5. Seed ascendente.
6. Nombre alfabético.

`tieBreakerCriteria` no modifica este orden dentro de `standing.engine.ts`. Sí se aplica cuando `qualification.engine.ts` compara equipos de diferentes grupos.

### Desempate entre grupos

En clasificación global se pueden activar/desactivar `setRatio`, `pointRatio` y `wins`. Después se compara menor cantidad de walkovers, seed y nombre. Si `draw` es verdadero, el comparador puede conservar el empate en lugar de resolverlo por nombre.

Cuando `normalizeStandingsForUnevenGroups` está activo, primero compara `PTS / PJ` y usa `PG / PJ` en vez de totales absolutos. Esto evita favorecer automáticamente a equipos que jugaron más partidos.

## 10. Modos de clasificación

### `topPerGroup`

Selecciona las primeras `topPerGroup` posiciones de cada grupo. El total depende del número de grupos.

### `topPerGroupPlusBestThirds`

Selecciona cupos directos y después los mejores equipos ubicados exactamente en la posición `topPerGroup + 1`. `bestThirdsCount` controla cuántos agrega.

### `topPerGroupPlusBestRemaining`

Selecciona los cupos directos, elimina esos equipos del universo y completa hasta `totalQualifiers` con los mejores restantes, sin limitarse a terceros. Es el modo adecuado cuando el cupo faltante puede salir de diferentes posiciones o existen grupos desiguales.

### `bestOverall`

Combina todos los standings y selecciona los primeros `totalQualifiers`, sin garantizar cupos directos por grupo.

El engine valida que existan grupos y standings, que estén presentes los parámetros obligatorios y que `totalQualifiers` no exceda el total de equipos.

## 11. Generación y avance del bracket

`EliminationService` lee `ChampionshipConfiguration` y los `Group.rankings` asociados al `groupDistributionId`. Luego:

1. comprueba que la eliminación esté habilitada;
2. comprueba que existan grupos y standings;
3. ejecuta `qualifyTeamsFromGroupStandings()`;
4. asigna `overallPosition` y, por tanto, seeds;
5. valida que el total coincida con `eliminationSettings.bracketSize`, si fue configurado;
6. ejecuta `generateEliminationBracket()`.

El bracket acepta entre 2 y 32 clasificados. Calcula el siguiente tamaño potencia de dos entre `[2, 4, 8, 16, 32]`, crea parejas estándar por seed y enlaza `winnerToMatchNumber`. Si corresponde, conecta perdedores de semifinales con el partido por tercer puesto.

`bracketProgression.engine.ts` puede marcar un partido como terminado y colocar ganador —y perdedor para tercer puesto— en la siguiente llave, pero todavía funciona sobre un objeto `BracketResult` en memoria.

### Validaciones necesarias antes de generar bracket

Actualmente se validan:

- configuración existente;
- `eliminationSettings.enabled`;
- IDs Mongo válidos en la ruta;
- existencia de grupos para la distribución;
- standings no vacíos;
- requisitos del modo de clasificación;
- total de clasificados no mayor que total de equipos;
- coincidencia con `bracketSize` configurado;
- mínimo 2 y máximo 32 clasificados.

Todavía debe validarse explícitamente:

- que `groupDistributionId` pertenezca al `championshipId` recibido;
- que todos los partidos de la fase de grupos estén `finished` o `walkover`;
- que no exista ya un bracket activo;
- que rankings incluyan todos los equipos esperados;
- que no haya grupos o partidos previos incompatibles tras una regeneración.

## 12. Casos de uso

| Equipos | Grupos | Clasificación | Total | Bracket |
|---:|---|---|---:|---:|
| 8 | 2×4 | 2 por grupo | 4 | 4 |
| 20 | 5×4 | 3 por grupo + 1 mejor restante | 16 | 16 |
| 22 | 4×4 + 2×3 | 2 por grupo + 4 mejores restantes normalizados | 16 | 16 |
| 24 | 6×4 | 2 por grupo + 4 mejores terceros/restantes | 16 | 16 |
| 32 | 8×4 | 2 por grupo | 16 | 16 |

### 8 equipos

Usar `qualificationMode: topPerGroup`, `topPerGroup: 2` y `bracketSize: 4`. El plan automático genera dos grupos de cuatro.

### 20 equipos

El plan automático genera cinco grupos de cuatro. Con `topPerGroup: 3` se obtienen 15 cupos directos; `topPerGroupPlusBestRemaining` y `totalQualifiers: 16` agregan el mejor equipo restante.

### 22 equipos

Con `numberOfGroups: 6` se generan cuatro grupos de cuatro y dos de tres. Doce equipos clasifican directamente con `topPerGroup: 2`; se agregan cuatro mejores restantes. Debe usarse `normalizeStandingsForUnevenGroups: true`.

### 24 equipos

Se generan seis grupos de cuatro. Con dos directos por grupo se obtienen 12. Los cuatro cupos restantes pueden salir de `topPerGroupPlusBestThirds` con `bestThirdsCount: 4`, o de `topPerGroupPlusBestRemaining` con `totalQualifiers: 16`.

### 32 equipos

Se generan ocho grupos de cuatro. `topPerGroup: 2` entrega exactamente 16 clasificados; no se necesitan mejores restantes.

## 13. Endpoints confirmados

El prefijo por defecto es `/api/v1`. `RouteLoader` monta dinámicamente cada archivo bajo el nombre del archivo, por lo que las rutas completas actuales son:

| Método | Ruta actual | Estado |
|---|---|---|
| `POST` | `/api/v1/groupDistribution/championships/:championshipId/group-distributions` | Crea distribución, grupos y partidos. |
| `POST` | `/api/v1/match/:matchId/result` | Registra resultado normal o walkover. |
| `POST` | `/api/v1/elimination/championships/:championshipId/group-distributions/:groupDistributionId/elimination-bracket` | Genera clasificación y bracket en memoria. |
| `PATCH` | `/api/v1/championship/:idConfiguration/configuration` | Actualiza configuración. |
| `GET` | `/api/v1/championship/:idConfiguration/configuration` | Consulta configuración. |
| `POST` | `/api/v1/championship/` | Crea campeonato mediante el controller actual. |

Si `API_PREFIX` se sobrescribe por entorno, debe sustituirse `/api/v1` por el valor desplegado.

No se confirmó un endpoint público dedicado para consultar standings; hoy se recalculan y persisten como `Group.rankings` al registrar resultados. Tampoco se confirmó un endpoint para avanzar ganadores del bracket.

## 14. Ejemplos para Postman

Todos los ejemplos requieren los headers de autenticación y tenant definidos por el despliegue. No agregar `tenant` al JSON.

### Configuración de campeonato de 8 equipos

```http
PATCH /api/v1/championship/{{configurationId}}/configuration
Content-Type: application/json
Authorization: Bearer {{token}}
```

```json
{
  "maxTeams": 8,
  "distributionStrategy": "serpentine",
  "matchRules": {
    "volleyballType": "beach",
    "setsToWin": 2,
    "maxSets": 3,
    "regularSetPoints": 21,
    "tieBreakPoints": 15,
    "minimumPointDifference": 2
  },
  "tablePointsPolicy": {
    "winPoints": 2,
    "lossPoints": 1,
    "walkoverLossPoints": 0,
    "walkoverWinPoints": 2
  },
  "tieBreakerCriteria": {
    "setRatio": true,
    "pointRatio": true,
    "draw": false
  },
  "eliminationSettings": {
    "enabled": true,
    "qualificationMode": "topPerGroup",
    "topPerGroup": 2,
    "totalQualifiers": 4,
    "normalizeStandingsForUnevenGroups": false,
    "bracketSeedingStrategy": "overallRanking",
    "bracketSize": 4,
    "includeThirdPlaceMatch": true,
    "initialMatchNumber": 1,
    "autoGenerateAfterGroupStage": false
  }
}
```

> El validator HTTP de actualización todavía no declara reglas específicas para `eliminationSettings`; Mongoose ejecuta validaciones del schema mediante `runValidators: true`.

### Crear dos grupos de cuatro

```http
POST /api/v1/groupDistribution/championships/{{championshipId}}/group-distributions
Content-Type: application/json
Authorization: Bearer {{token}}
```

```json
{
  "name": "Fase de grupos",
  "numberOfGroups": 2,
  "groupSizePreference": "preferGroupsOf4",
  "avoidSameClub": true
}
```

La estrategia efectiva se toma actualmente de `ChampionshipConfiguration.distributionStrategy`; el `formatType` del body se guarda como metadato, pero no selecciona el engine si difiere de la configuración.

### Resultado normal

```http
POST /api/v1/match/{{matchId}}/result
Content-Type: application/json
Authorization: Bearer {{token}}
```

```json
{
  "sets": [
    { "homeTeam": 21, "awayTeam": 18 },
    { "homeTeam": 17, "awayTeam": 21 },
    { "homeTeam": 15, "awayTeam": 12 }
  ]
}
```

### Walkover

```http
POST /api/v1/match/{{matchId}}/result
Content-Type: application/json
Authorization: Bearer {{token}}
```

```json
{
  "walkoverWinnerId": "{{teamId}}"
}
```

`walkoverTeamId` no es el nombre aceptado por el servicio actual. Si se desea ese contrato, debe añadirse una normalización explícita; por ahora usar `walkoverWinnerId`.

### Generación de bracket con body vacío

```http
POST /api/v1/elimination/championships/{{championshipId}}/group-distributions/{{groupDistributionId}}/elimination-bracket
Content-Type: application/json
Authorization: Bearer {{token}}
```

```json
{}
```

### Generación usando configuración desde MongoDB

La misma llamada anterior ya usa MongoDB. El endpoint no espera opciones en el body: el servicio busca `ChampionshipConfiguration` por `championshipId`, lee `eliminationSettings` y `tieBreakerCriteria`, y lee rankings por `groupDistributionId`.

```http
POST /api/v1/elimination/championships/{{championshipId}}/group-distributions/{{groupDistributionId}}/elimination-bracket
Authorization: Bearer {{token}}
```

Sin body, o con body vacío:

```json
{}
```

## 15. Pendientes / TODO

- [ ] Persistir el bracket en MongoDB.
- [ ] Evitar regenerar el bracket si ya existe uno activo.
- [ ] Crear documentos `Match` para los partidos de eliminación.
- [ ] Avanzar ganadores automáticamente y persistir el nuevo estado.
- [ ] Validar que todos los partidos de fase de grupos estén terminados antes de generar bracket.
- [ ] Documentar endpoints definitivos cuando el flujo quede estable.
- [ ] Reforzar la validación de múltiples `GroupDistribution` activos/draft por campeonato y considerar condiciones de carrera.
- [ ] Definir estrategia de `forceRegenerate` o archivado de grupos y partidos previos.
- [ ] Envolver la creación de distribución/grupos/partidos y la actualización resultado/standings en transacciones.
- [ ] Eliminar el límite fijo de 100 partidos en el recálculo de standings o paginar hasta consumir todos.
- [ ] Inicializar rankings desde `Group.teams` para incluir equipos con cero partidos terminados.
- [ ] Aplicar `tieBreakerCriteria` también dentro de `standing.engine.ts`, o documentar que solo afecta comparaciones entre grupos.
- [ ] Implementar realmente `bracketSeedingStrategy` y `autoGenerateAfterGroupStage`.
- [ ] Validar `eliminationSettings` de forma completa en la capa HTTP.
- [ ] Corregir la interfaz `IEliminationSettings`: el schema y el engine soportan `topPerGroupPlusBestRemaining`, pero la unión TypeScript del modelo no lo incluye.
- [ ] Alinear `ITieBreakerCriteria` del modelo con `TieBreakerCriteria` de dominio, donde también existe `wins`.
- [ ] Verificar que `groupDistributionId` pertenezca al `championshipId` al generar bracket.
- [ ] Reemplazar `any` en los servicios por tipos de dominio/configuración.
- [ ] Definir una representación serializable para ratios infinitos; `Infinity` se convierte en `null` al serializar JSON.
- [ ] Añadir validación HTTP específica para resultados y ObjectIds.
- [ ] Revisar la validación `pre('save')` de `Championship`, que referencia campos de fechas de registro no declarados en la interfaz/schema mostrado.
- [ ] Revisar `GroupService.createGroup()`: todavía inicializa nombres antiguos (`matchesWon`, `setsWon`, etc.) que no corresponden al schema actual de rankings de voleibol.
- [ ] Mejorar `roundNumber` para producir jornadas round-robin reales y evitar cruces simultáneos o descansos insuficientes.

## 16. Estado actual resumido

El núcleo deportivo ya existe: distribución, round-robin, validación de resultados, walkover, standings de voleibol, clasificación flexible, bracket por seeds y avance en memoria. El flujo HTTP principal también está definido y cargado dinámicamente.

La brecha principal no está en el cálculo, sino en la robustez operativa: transacciones, validaciones de cierre de fase, persistencia del bracket, creación de partidos eliminatorios, prevención de regeneraciones y avance automático persistido.
