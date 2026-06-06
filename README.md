# SAAS Project Backend

Backend service for a multi-tenant SAAS application built with TypeScript and Express.

## Project Structure
```
src
   │   app.ts
│   
├───api
│   ├───config
│   │   │   env.config.ts
│   │   │   index.ts
│   │   │   
│   │   ├───auth
│   │   │       auth.config.ts
│   │   │       index.ts
│   │   │       
│   │   ├───db
│   │   │   │   index.ts
│   │   │   │   
│   │   │   └───Mongoose
│   │   │           connection.ts
│   │   │           index.ts
│   │   │           
│   │   ├───logger
│   │   │       index.ts
│   │   │       WinstonLogger.ts
│   │   │       
│   │   └───passport
│   │           passport.ts
│   │           
│   ├───constants
│   │   │   auth.constants.ts
│   │   │   index.ts
│   │   │   user.constants.ts
│   │   │   
│   │   └───apiRoutes
│   │       │   index.ts
│   │       │   
│   │       ├───auth
│   │       │       authRoutes.ts
│   │       │       
│   │       ├───championship
│   │       │       championshipsRoutes.ts
│   │       │       
│   │       ├───invitationlinkroutes.ts
│   │       │       invitationlinkRoutes.ts
│   │       │       
│   │       ├───plugins
│   │       │       pluginsRoutes.ts
│   │       │       
│   │       ├───profile
│   │       │       profileroutes.ts
│   │       │       
│   │       └───users
│   │               userRoutes.ts.ts
│   │               
│   ├───controllers
│   │   │   index.ts
│   │   │   
│   │   ├───auth
│   │   │       auth.controller.ts
│   │   │       authSocial.controller.ts
│   │   │       index.ts
│   │   │       
│   │   ├───base
│   │   ├───championship
│   │   │       championship.controller.ts
│   │   │       gameFormat.controller.ts
│   │   │       invitationLink.controller.ts
│   │   │       
│   │   ├───plugins
│   │   │       plugins.controller.ts
│   │   │       
│   │   ├───profile
│   │   │       profile.controller.ts
│   │   │       
│   │   ├───tenant
│   │   └───users
│   │           user.controller.ts
│   │           
│   ├───errors
│   │       AuthError.ts
│   │       index.ts
│   │       ValidationError.ts
│   │       
│   ├───interfaces
│   │       Iauth.ts
│   │       ICustomrequest.ts
│   │       IhelperDatabase.ts
│   │       index.ts
│   │       IPluginsCustomRequest.ts
│   │       model.interface.ts
│   │       
│   ├───middlewares
│   │   │   auth.middleware.ts
│   │   │   index.ts
│   │   │   
│   │   ├───auth
│   │   │       index.ts
│   │   │       origin.ts
│   │   │       roleAuthorization.middleware.ts
│   │   │       validator.middleware.ts
│   │   │       
│   │   ├───error
│   │   │       error.middleware.ts
│   │   │       index.ts
│   │   │       
│   │   ├───tenant
│   │   └───validation
│   ├───models
│   │   │   index.ts
│   │   │   
│   │   ├───mongoose
│   │   │   │   forgotPassword.model.ts
│   │   │   │   index.ts
│   │   │   │   
│   │   │   ├───championship
│   │   │   │       championship.ts
│   │   │   │       configuration.ts
│   │   │   │       court.ts
│   │   │   │       gameFormat.ts
│   │   │   │       group.ts
│   │   │   │       groupsDistrubution.ts
│   │   │   │       invitationLink.ts
│   │   │   │       match.ts
│   │   │   │       phase.ts
│   │   │   │       player.ts
│   │   │   │       registration.ts
│   │   │   │       statistics.ts
│   │   │   │       team.ts
│   │   │   │       
│   │   │   ├───plugins
│   │   │   │       plugins.ts
│   │   │   │       pluginsettings.ts
│   │   │   │       
│   │   │   ├───referred
│   │   │   │       referred.ts
│   │   │   │       
│   │   │   ├───setting
│   │   │   │       setting.ts
│   │   │   │       
│   │   │   └───user
│   │   │           index.ts
│   │   │           User.ts
│   │   │           
│   │   └───server
│   │           index.ts
│   │           server.ts
│   │           
│   ├───responses
│   │       apiResponse.ts
│   │       index.ts
│   │       
│   ├───routes
│   │   │   index.ts
│   │   │   
│   │   ├───auth
│   │   │       auth.ts
│   │   │       
│   │   ├───authSocial
│   │   │       socialAuth.ts
│   │   │       
│   │   ├───championship
│   │   │       championship.ts
│   │   │       
│   │   ├───gameformat
│   │   │       gameFormat.ts
│   │   │       
│   │   ├───invitationlink
│   │   │       invitationLink.ts
│   │   │       
│   │   ├───plugins
│   │   │       plugins.ts
│   │   │       
│   │   ├───profile
│   │   │       profile.ts
│   │   │       
│   │   └───users
│   │           users.ts
│   │           
│   ├───seeds
│   │       gameFormats.seed.ts
│   │       
│   ├───services
│   │   ├───auth
│   │   │       auth.service.ts
│   │   │       token.service.ts
│   │   │       
│   │   ├───championship
│   │   │       championship.service.ts
│   │   │       configuration.service.ts
│   │   │       gameformat.service.ts
│   │   │       group.service.ts
│   │   │       invitationLink.service.ts
│   │   │       phase.service.ts
│   │   │       
│   │   ├───email
│   │   │       email.service.ts
│   │   │       facebook.service.ts
│   │   │       
│   │   ├───plugin
│   │   │       plugin.service.ts
│   │   │       
│   │   ├───plugins
│   │   │       plugins.service.ts
│   │   │       
│   │   ├───profile
│   │   │       profile.service.ts
│   │   │       
│   │   ├───setting
│   │   │       settings.service.ts
│   │   │       
│   │   └───user
│   │           user.service.ts
│   │           
│   ├───templates
│   │       emailrestpasword.html
│   │       initial_invoice.html
│   │       verification-es.html
│   │       
│   ├───utils
│   │       crypto.ts
│   │       database.helper.ts
│   │       dataProcessor.ts
│   │       index.ts
│   │       matchUtils.ts
│   │       mongoose.helper.ts
│   │       password.util.ts
│   │       queryHelper.ts
│   │       request.helper.ts
│   │       
│   └───validators
│       │   index.ts
│       │   
│       ├───auth
│       │       auth.validator.ts
│       │       index.ts
│       │       password.validator.ts
│       │       
│       ├───championships
│       │       championship.validator.ts
│       │       gameformat.validator.ts
│       │       generatelink.validator.ts
│       │       
│       ├───custom
│       │       index.ts
│       │       socialUrl.validator.ts
│       │       
│       ├───expressValidatorHelper
│       │       checkFieldTovalidate.ts
│       │       index.ts
│       │       
│       └───user
│               profile.validate.ts
│               user.validate.ts
│               
├───test
│       groupDistribution.test.ts
│       script.js
│       style.css
│       styles.css
│       Untitled-1.html
│       
└───types
        mongo-tenant.d.ts
        trim-request.d.ts



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
