# SetPoint API

Backend de una plataforma **SaaS multitenant** para organizar campeonatos de voleibol de sala y playa. Cada organización utiliza la misma aplicación, pero sus usuarios, campeonatos y recursos permanecen aislados mediante el tenant asociado a cada solicitud.

## Funcionalidades principales

- Gestión de organizaciones, usuarios, roles y permisos.
- Creación y configuración de campeonatos.
- Reglas para voleibol indoor y beach.
- Gestión de equipos, jugadores, categorías y canchas.
- Inscripción pública mediante enlaces de invitación.
- Generación de grupos, programación de partidos y eliminación.
- Registro de resultados, posiciones y estadísticas.
- Pagos de inscripción mediante Mercado Pago.
- Carga de imágenes mediante Cloudinary.
- Notificaciones por correo electrónico.

## Arquitectura

La API utiliza una arquitectura modular por capas:

```text
HTTP request
   │
   ▼
Routes → Middlewares → Validators → Controllers → Services
                                                  │
                                                  ▼
                                      Domain rules / Models
                                                  │
                                                  ▼
                                               MongoDB
```

El código principal se encuentra en `src/api`:

```text
src/api/
├── config/          # Entorno, base de datos y logging
├── constants/       # Rutas, permisos y constantes
├── controllers/     # Adaptadores HTTP
├── domain/          # Reglas puras del dominio
├── middlewares/     # Auth, tenant, permisos y errores
├── models/          # Modelos Mongoose
├── routes/          # Definición de endpoints
├── services/        # Casos de uso
├── utils/           # Utilidades compartidas
└── validators/      # Validación de entrada
```

## Tecnologías

- TypeScript
- Node.js y Express
- MongoDB y Mongoose
- JWT y Passport
- Vitest
- Winston
- Mercado Pago
- Cloudinary
- Redis

## Requisitos

- Node.js 20 o superior, o Bun
- MongoDB local o MongoDB Atlas
- Redis para las funciones que utilizan caché

## Instalación

```bash
git clone <URL_DEL_REPOSITORIO_BACKEND>
cd SAAS-Project-BackEnd
bun install
```

Crea el archivo local de configuración a partir del ejemplo:

```bash
cp .env.example .env
```

En PowerShell:

```powershell
Copy-Item .env.example .env
```

Completa como mínimo la conexión a MongoDB, el secreto JWT, los orígenes permitidos y las URLs del frontend.

> Nunca subas `.env`, contraseñas, tokens ni credenciales reales al repositorio.

## Ejecución

El proyecto dispone actualmente de estos comandos:

```bash
bun run watch-ts     # Compilación TypeScript en modo observación
bun run start        # Ejecuta el código compilado
bun run typecheck    # Verificación de tipos
bun run test:run     # Suite de pruebas
bun run test:coverage
bun run lint
bun run qa           # TypeScript + pruebas
```

La API utiliza por defecto:

```text
http://localhost:8000/api/v1
```

## Multitenancy y seguridad

El tenant se resuelve desde la solicitud y se aplica en las consultas de datos. La API también utiliza autenticación JWT y autorización basada en permisos.

Principios importantes:

- Nunca confiar en un tenant enviado arbitrariamente por el cliente.
- Mantener todas las consultas sensibles aisladas por tenant.
- Revalidar en backend las reglas de campeonato e inscripción.
- No exponer documentos completos de MongoDB en endpoints públicos.
- No registrar contraseñas, tokens ni datos personales sensibles.

## Pruebas

```bash
bun run test:run
bun run typecheck
```

Las pruebas cubren reglas del dominio, contratos de servicios, aislamiento entre tenants, enlaces públicos, concurrencia de inscripciones y pagos.

## Frontend

Este backend es consumido por la aplicación Next.js de SetPoint. Configura `FRONTEND_URL_TENANT` y `ALLOWED_ORIGINS` de acuerdo con los dominios utilizados en cada entorno.

## Estado del proyecto

Proyecto académico y en desarrollo activo. Se utiliza para aplicar diseño de software, arquitectura por capas, modelado del dominio, seguridad multitenant, pruebas automatizadas y mantenibilidad.

## Licencia

No se ha definido una licencia pública. Si el repositorio se publica, agrega una licencia antes de permitir reutilización externa.
