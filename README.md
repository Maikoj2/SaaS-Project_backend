# SAAS Project Backend

Backend service for a multi-tenant SAAS application built with TypeScript and Express.

## Project Structure
```
src
   └── api
   |  ├── config
   |  |  ├── auth
   |  |  ├── db
   |  |  ├── logger
   |  |  └── passport
   |  ├── constants
   |  ├── controllers
   |  |  ├── auth
   |  |  ├── base
   |  |  ├── profile
   |  |  ├── tenant
   |  |  └── user
   |  ├── errors
   |  ├── interfaces
   |  ├── middlewares
   |  |  ├── auth
   |  |  ├── error
   |  |  ├── tenant
   |  |  └── validation
   |  ├── models
   |  |  ├── apiRoutes
   |  |  ├── mongoose
   |  |  └── server
   |  ├── responses
   |  ├── routes
   |  |  ├── auth
   |  |  ├── authSocial
   |  |  └── profile
   |  ├── services
   |  ├── templates
   |  ├── utils
   |  └── validators
   |     ├── auth
   |     ├── custom
   |     ├── tenant
   |     └── user



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
