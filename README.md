# SAAS Project Backend

Backend service for a multi-tenant SAAS application built with TypeScript and Express.

## Project Structure
```
src/                      # Source code
    └── api/
        ├── config/          # Configuration files
        │   ├── Db/         # Database configurations
        │   └── logger/     # Logging configurations
        ├── controllers/    # Request handlers
        │   ├── auth/      # Authentication controllers
        │   ├── base/      # Base controller classes
        │   ├── tenant/    # Tenant management
        │   └── user/      # User management
        ├── middlewares/   # Express middlewares
        │   ├── auth/      # Authentication middlewares
        │   ├── error/     # Error handling
        │   ├── tenant/    # Tenant-specific middlewares
        │   └── validation/# Request validation
        ├── models/        # Data models
        │   └── server/    # Server configuration
        ├── responses/     # Response formatters
        ├── routes/        # API routes
        │   └── auth/      # Authentication routes
        ├── utils/         # Utility functions
        │   └── common/    # Common utilities
        └── validators/    # Input validators
            ├── tenant/    # Tenant validation
            └── user/      # User validation
```

## Installation

```bash
# Install dependencies
bun install

# Create .env file
cp .env.example .env
```

## Environment Variables

```env
# MongoDB Configuration
DB_URI=your_mongodb_uri
DB_NAME=your_database_name

# Server Configuration
PORT=8000

# Other Configuration
NODE_ENV=development
```

## Running the Application

```bash
# Development
bun run dev

# Production
bun run start
```

## Built With

- TypeScript
- Express.js
- MongoDB with Mongoose
- Winston Logger
- Bun Runtime

## Scripts

```bash
bun run dev      # Run in development mode
bun run build    # Build the project
bun run start    # Run in production mode
bun run test     # Run tests
```

This project was created using `bun init` in bun v1.1.33. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
