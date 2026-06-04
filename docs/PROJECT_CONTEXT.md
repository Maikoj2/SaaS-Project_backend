# PROJECT_CONTEXT.md

## Project Vision
Multi-tenant SaaS platform for managing volleyball championships.

## Current Goal
Build a scalable, secure and maintainable platform before adding new business features.

## Technology Stack
- Bun
- TypeScript
- Express
- MongoDB
- Mongoose
- JWT

## Architecture Rules
Controller -> Service -> Repository -> Database

Never place business logic inside controllers.

## Multi-Tenant Rules
Every resource belongs to a tenant.
Every query must validate tenant ownership.

## Roles
- Admin
- Organizer
- Referee
- TeamMember
- Viewer

## Coding Standards
- English for code and error messages.
- Strong typing.
- Reusable services.
- Centralized validations.
