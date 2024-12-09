src/
├── api/                    # Capa de API
│   ├── config/            # Configuraciones
│   │   ├── database/      # Configuración de BD
│   │   │   ├── mongoose.ts
│   │   │   └── index.ts
│   │   ├── logger/       # Logger
│   │   │   ├── WinstonLogger.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── models/           # Modelos de datos
│   │   ├── auth/
│   │   │   └── User.model.ts
│   │   ├── tenant/
│   │   │   └── Tenant.model.ts
│   │   └── index.ts
│   │
│   ├── controllers/      # Controladores
│   │   ├── base/
│   │   │   └── BaseController.ts
│   │   ├── auth/
│   │   │   └── AuthController.ts
│   │   ├── tenant/
│   │   │   └── TenantController.ts
│   │   ├── user/
│   │   │   └── UserController.ts
│   │   └── index.ts
│   │
│   ├── services/        # Servicios de negocio
│   │   ├── auth/
│   │   │   └── AuthService.ts
│   │   ├── tenant/
│   │   │   └── TenantService.ts
│   │   └── index.ts
│   │
│   ├── middlewares/     # Middlewares
│   │   ├── auth/
│   │   │   └── auth.middleware.ts
│   │   ├── tenant/
│   │   │   └── tenant.middleware.ts
│   │   ├── validation/
│   │   │   └── validation.middleware.ts
│   │   └── index.ts
│   │
│   ├── routes/          # Rutas
│   │   ├── v1/
│   │   │   ├── auth.routes.ts
│   │   │   ├── tenant.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── utils/           # Utilidades
│   │   ├── common/
│   │   │   ├── helpers.ts
│   │   │   └── constants.ts
│   │   └── index.ts
│   │
│   ├── validators/      # Validadores
│   │   ├── tenant/
│   │   │   └── tenant.validator.ts
│   │   ├── user/
│   │   │   └── user.validator.ts
│   │   └── index.ts
│   │
│   ├── types/          # Tipos y interfaces
│   │   ├── auth.types.ts
│   │   ├── tenant.types.ts
│   │   └── index.ts
│   │
│   ├── responses/      # Respuestas estandarizadas
│   │   ├── ApiResponse.ts
│   │   ├── ErrorResponse.ts
│   │   └── index.ts
│   │
│   ├── app.ts         # Configuración de Express
│   └── server.ts      # Punto de entrada

npx tree-cli -l 4 --ignore='node_modules/, .git/, .gitignore, dist/, logs/, types/' -o out.txt -d