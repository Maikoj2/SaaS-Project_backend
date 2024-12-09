# Estructura del Proyecto SAAS Backend

## Directorios Principales

### /src
Código fuente principal de la aplicación.

### /src/api
Contiene toda la lógica de la API REST.

#### /config
- **auth/**: Configuraciones de autenticación y autorización
- **db/**: Configuraciones de base de datos
- **logger/**: Configuración del sistema de logs
- **passport/**: Estrategias de autenticación con Passport

#### /constants
Constantes y enumeraciones globales de la aplicación.

#### /controllers
- **auth/**: Controladores de autenticación
- **base/**: Controladores base/abstractos
- **profile/**: Gestión de perfiles de usuario
- **tenant/**: Gestión de inquilinos (multi-tenancy)
- **user/**: Gestión de usuarios

#### /errors
Definiciones personalizadas de errores.

#### /interfaces
Interfaces TypeScript y tipos personalizados.

#### /middlewares
- **auth/**: Middleware de autenticación
- **error/**: Manejo centralizado de errores
- **tenant/**: Middleware de multi-tenancy
- **validation/**: Validación de requests

#### /models
- **apiRoutes/**: Definiciones de rutas API
- **mongoose/**: Modelos de MongoDB/Mongoose
- **server/**: Configuración del servidor Express

#### /responses
Formateadores de respuestas HTTP.

#### /routes
- **auth/**: Rutas de autenticación
- **authSocial/**: Autenticación con redes sociales
- **profile/**: Rutas de perfil de usuario

#### /services
Servicios de negocio y lógica de aplicación.

#### /templates
Plantillas para emails y otros contenidos.

#### /utils
Utilidades y helpers.

#### /validators
- **auth/**: Validadores de autenticación
- **custom/**: Validadores personalizados
- **tenant/**: Validadores de tenant
- **user/**: Validadores de usuario

### /types
Declaraciones de tipos globales y módulos.

### /logs
Archivos de registro de la aplicación. 