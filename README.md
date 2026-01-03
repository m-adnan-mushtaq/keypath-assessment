# KeyPath Backend Technical Test - Multi-Tenant Property Management API

A production-ready Node.js + TypeScript REST API implementing multi-tenant property management with ownership credits ledger system.

## 🏗️ Architecture Overview

This implementation features:
- **Single Database Multi-Tenancy**: Organization-scoped data isolation using `orgId` field
- **Header-Based Authentication**: Simulated JWT auth using `x-user-id`, `x-org-id`, `x-role` headers
- **Role-Based Authorization**: Three roles (tenant, landlord, admin) with granular permissions
- **Append-Only Credit Ledger**: Immutable transaction history with computed balances
- **Comprehensive Validation**: Zod schemas for type-safe request validation
- **Pagination Support**: Built-in pagination for all list endpoints

## 🚀 Quick Start

### Prerequisites
- Node.js 14.20.1 - 18.x (NOT compatible with Node.js v19+)
- MongoDB 4.4+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Configure MONGODB_URL in .env

# Compile TypeScript
npm run compile

# Start development server
npm run dev
```

## 📚 API Endpoints

### Authentication Headers (Required for all protected routes)
```
x-user-id: <user-id>
x-org-id: <organization-id>
x-role: tenant | landlord | admin
```

### Properties

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| POST | `/v1/properties` | `manageProperties` | Create new property |
| GET | `/v1/properties` | `manageProperties` | List properties (org-scoped, filterable by city/state) |
| GET | `/v1/properties/:id` | `manageProperties` | Get property details |
| PATCH | `/v1/properties/:id` | `manageProperties` | Update property |
| DELETE | `/v1/properties/:id` | `manageProperties` | Delete property |

**Property Schema:**
```json
{
  "address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94101",
    "country": "USA"
  },
  "nickname": "Downtown Apartment Complex"
}
```

### Units (Nested under Properties)

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| POST | `/v1/properties/:propertyId/units` | `manageUnits` | Create unit in property |
| GET | `/v1/properties/:propertyId/units` | `manageUnits` | List units in property |

**Unit Schema:**
```json
{
  "unitNumber": "101",
  "rent": 2500.00
}
```

### Tenants

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| POST | `/v1/tenants` | `manageTenants` | Create tenant profile |
| GET | `/v1/tenants/me` | `getOwnProfile` | Get authenticated tenant's profile |

**Tenant Schema:**
```json
{
  "unitId": "507f1f77bcf86cd799439011",
  "userId": "user123",
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Credits (Ownership Credit Ledger)

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| POST | `/v1/tenants/:tenantId/credits/earn` | `manageCredits` | Award credits to tenant |
| POST | `/v1/tenants/:tenantId/credits/redeem` | `redeemCredits` or self-access | Redeem credits (validates balance) |
| GET | `/v1/tenants/:tenantId/credits/ledger` | Self-access or org-scoped | View transaction history |
| GET | `/v1/tenants/:tenantId/credits/balance` | Self-access or org-scoped | Get current balance |

**Credit Transaction Types:**
- `EARN`: Positive credit (e.g., rent payment, referral bonus)
- `REDEEM`: Negative credit (e.g., purchase, redemption) - validates balance before allowing
- `ADJUST`: Correction transaction (positive or negative)

**Earn/Redeem Request:**
```json
{
  "amount": 100.00,
  "memo": "Monthly rent payment"
}
```

## 🔐 Multi-Tenant Data Isolation

### Organization Scoping Strategy

All data models include an `orgId` field that enforces tenant isolation:

1. **Middleware Layer**: `multiTenantAuth()` extracts `x-org-id` header and attaches to `req.orgId`
2. **Service Layer**: Every query automatically filters by `{orgId: req.orgId}`
3. **Database Indexes**: Compound indexes on `orgId` + query fields for performance

**Index Strategy:**
```typescript
// Property indexes
{orgId: 1, city: 1}     // Filter properties by city within org
{orgId: 1, state: 1}    // Filter properties by state within org

// Unit indexes
{propertyId: 1, unitNumber: 1, unique: true}  // Unique unit numbers per property

// Tenant indexes
{userId: 1, unique: true}        // One tenant profile per user globally
{orgId: 1, email: 1, unique: true}  // Unique email per org

// Credit Transaction indexes
{orgId: 1, tenantId: 1, createdAt: -1}  // Efficient ledger queries
{tenantId: 1, createdAt: -1}            // Balance computation
```

## 🔒 Role-Based Access Control

### Roles & Permissions

| Role | Permissions |
|------|-------------|
| **tenant** | `getOwnProfile`, `redeemCredits`, `viewOwnCredits` |
| **landlord** | `manageProperties`, `manageUnits`, `manageTenants`, `manageCredits`, `viewLedger` |
| **admin** | All permissions (includes `getUsers`, `manageUsers`) |

### Authorization Patterns

```typescript
// Simple permission check
router.post('/properties', 
  multiTenantAuth(), 
  authorize('manageProperties'),
  createProperty
);

// Self-access check (tenant can access own data OR landlord/admin in same org)
router.get('/:tenantId/credits/ledger',
  multiTenantAuth(),
  async (req, res, next) => {
    if (await canAccessTenant(req, tenantId)) next();
    else res.status(403).send({message: 'Forbidden'});
  },
  getCreditLedger
);
```

## 💰 Append-Only Credit Ledger

### Business Rules (Critical Features)

1. **Immutability**: All credit transactions are append-only
   - Schema-level: All fields marked `immutable: true`
   - Pre-hooks: Prevent `findOneAndUpdate` and `findOneAndDelete`
   - Corrections: Use `ADJUST` transaction type instead of editing

2. **Balance Validation**: Cannot redeem more than available balance
   ```typescript
   // Service layer validation
   const balance = await getTenantBalance(tenantId, orgId);
   if (balance < redeemAmount) {
     throw new ApiError(400, `Insufficient balance. Current: ${balance}, Requested: ${redeemAmount}`);
   }
   ```

3. **Computed Balances**: Balance derived from SUM aggregation
   ```typescript
   const balance = await CreditTransaction.aggregate([
     {$match: {tenantId, orgId}},
     {$group: {_id: null, balance: {$sum: '$amount'}}}
   ]);
   ```

### Transaction Amount Conventions
- `EARN`: Positive amount (e.g., `+100`)
- `REDEEM`: Negative amount (e.g., `-50`)
- `ADJUST`: Can be positive or negative

## 📊 Pagination

All list endpoints support pagination with these query parameters:

- `sortBy`: Field and order, e.g., `createdAt:desc` or `city:asc`
- `limit`: Results per page (default: 10)
- `page`: Page number (default: 1)
- `populate`: Related fields to populate, e.g., `property,unit`

**Example Request:**
```bash
GET /v1/properties?city=San Francisco&sortBy=createdAt:desc&limit=20&page=1
```

**Paginated Response:**
```json
{
  "results": [...],
  "page": 1,
  "limit": 20,
  "totalPages": 5,
  "totalResults": 87
}
```

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run coverage

# Watch mode
npm run test:watch
```

### Example Test Cases

1. **Auth Scoping Test**:
   ```typescript
   // Verify tenant from org1 cannot access org2 properties
   const org1Property = await createProperty(org1Headers);
   const response = await request(app)
     .get(`/v1/properties/${org1Property.id}`)
     .set(org2Headers)
     .expect(404);  // Not found in org2 scope
   ```

2. **Redeem Balance Validation Test**:
   ```typescript
   // Earn 100, attempt to redeem 150 (should fail)
   await earnCredits(tenant.id, 100);
   await request(app)
     .post(`/v1/tenants/${tenant.id}/credits/redeem`)
     .send({amount: 150})
     .expect(400)
     .expect(/Insufficient balance/);
   ```

3. **Balance Derivation Test**:
   ```typescript
   // EARN(100) + ADJUST(10) + REDEEM(-30) = 80
   await earnCredits(tenant.id, 100);
   await adjustCredits(tenant.id, 10);
   await redeemCredits(tenant.id, 30);
   const balance = await getBalance(tenant.id);
   expect(balance.balance).toBe(80);
   ```

## 📁 Project Structure

```
src/
├── config/
│   ├── config.ts           # Environment configuration
│   └── roles.ts            # Role definitions and permissions
├── modules/
│   ├── auth/
│   │   └── multiTenantAuth.middleware.ts  # Header-based auth
│   ├── property/           # Property CRUD
│   │   ├── property.model.ts
│   │   ├── property.service.ts
│   │   ├── property.controller.ts
│   │   ├── property.validation.ts  # Zod schemas
│   │   └── property.route.ts
│   ├── unit/               # Unit management
│   ├── tenant/             # Tenant profiles
│   └── credit/             # Ownership credit ledger
│       ├── credit.model.ts        # Immutable transaction schema
│       ├── credit.service.ts      # Balance computation & validation
│       └── credit.controller.ts
├── routes/
│   └── v1/
│       └── index.ts        # Route registration
└── app.ts                  # Express app setup
```

## 🛠️ Technical Stack

- **Runtime**: Node.js 14.20.1 - 18.x
- **Language**: TypeScript 5.x
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Zod (replaced Joi per requirements)
- **Testing**: Jest with Supertest
- **Job Queue**: BullMQ + Redis (for bonus features)

## 🔧 Environment Variables

```env
# MongoDB
MONGODB_URL=mongodb://localhost:27017/keypath

# Node Environment
NODE_ENV=development

# Redis (for BullMQ job queue - optional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 📮 Example API Usage

### Create Property
```bash
curl -X POST http://localhost:3000/v1/properties \
  -H "x-user-id: user123" \
  -H "x-org-id: org456" \
  -H "x-role: landlord" \
  -H "Content-Type: application/json" \
  -d '{
    "address": {
      "street": "123 Main St",
      "city": "San Francisco",
      "state": "CA",
      "zip": "94101",
      "country": "USA"
    },
    "nickname": "Downtown Apartment"
  }'
```

### Award Credits
```bash
curl -X POST http://localhost:3000/v1/tenants/{tenantId}/credits/earn \
  -H "x-user-id: landlord123" \
  -H "x-org-id: org456" \
  -H "x-role: landlord" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150.00,
    "memo": "On-time rent payment bonus"
  }'
```

### Check Balance
```bash
curl http://localhost:3000/v1/tenants/{tenantId}/credits/balance \
  -H "x-user-id: tenant123" \
  -H "x-org-id: org456" \
  -H "x-role: tenant"
```

## 🚧 Known Limitations

1. **Simplified Authentication**: Uses header-based auth instead of full JWT implementation for assessment simplicity
2. **No Email Verification**: Tenant creation doesn't send verification emails
3. **No Rate Limiting**: Per-tenant rate limiting not implemented
4. **No Soft Deletes**: Records are hard deleted (could implement `deletedAt` field)

## 📝 Development Notes

### Why Header-Based Auth?
Per requirements, this simulates JWT/Auth0/Clerk authentication without the complexity of token management. In production:
- Replace with real JWT middleware
- Validate tokens against Auth0/Clerk
- Extract `orgId` and `role` from JWT claims

### Why Zod Instead of Joi?
Requirements specified Zod for validation. Benefits:
- Better TypeScript inference
- Smaller bundle size
- More modern API

### Index Optimization Rationale
- **orgId indexes**: Essential for tenant isolation performance
- **Compound indexes**: Support common query patterns (city/state filtering)
- **Unique constraints**: Enforce business rules at DB level
- **createdAt DESC**: Optimizes recent-first ledger queries

---

# RESTful API Node Typescript Server Boilerplate

[![Node.js CI](https://github.com/saisilinus/node-express-mongoose-typescript-boilerplate/actions/workflows/node.js.yml/badge.svg)](https://github.com/saisilinus/node-express-mongoose-typescript-boilerplate/actions/workflows/node.js.yml)
[![codecov](https://codecov.io/gh/saisilinus/node-express-mongoose-typescript-boilerplate/branch/master/graph/badge.svg?token=UYJAL9KTMD)](https://codecov.io/gh/saisilinus/node-express-mongoose-typescript-boilerplate)

By running a single command, you will get a production-ready Node.js TypeScript app installed and fully configured on your machine. The app comes with many built-in features, such as authentication using JWT, request validation, unit and integration tests, continuous integration, docker support, API documentation, pagination, etc. For more details, check the features list below.

## Not Compatible with Node.js v19

Node.js has deprecated the `--es-module-specifier-resolution=node` flag, used in this app, in the release of [Node.js v19](https://nodejs.org/en/blog/announcements/v19-release-announce/#custom-esm-resolution-adjustments) in favor of [custom loaders](https://github.com/nodejs/loaders-test/tree/main/commonjs-extension-resolution-loader). You can check out the PR [here](https://github.com/nodejs/node/pull/44859).

As a result, this app is not compatible with Node.js >=19. You can add support to your app using this [loader](https://github.com/nodejs/loaders-test/tree/main/commonjs-extension-resolution-loader)

## Quick Start

To create a project, simply run:

```bash
npx create-nodejs-ts-app <project-name>
```

Or

```bash
npm init nodejs-ts-app <project-name>
```

## Manual Installation

Clone the repo:

```bash
git clone --depth 1 https://github.com/saisilinus/node-express-mongoose-typescript-boilerplate.git
cd node-express-mongoose-typescript-boilerplate
```

Install the dependencies:

```bash
yarn install
```

Set the environment variables:

```bash
cp .env.example .env

# open .env and modify the environment variables (if needed)
```

## Table of Contents

- [Features](#features)
- [Commands](#commands)
- [Making Changes](#making-changes)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Error Handling](#error-handling)
- [Validation](#validation)
- [Authentication](#authentication)
- [Authorization](#authorization)
- [Logging](#logging)
- [Custom Mongoose Plugins](#custom-mongoose-plugins)
  - [To JSON Plugin](#tojson)
  - [Paginate Plugin](#paginate)
- [Linting](#linting)
- [Contributing](#contributing)
- [Inspirations](#inspirations)
- [License](#license)

## Features

- **ES9**: latest ECMAScript features
- **Static Typing**: [TypeScript](https://www.typescriptlang.org/) static typing using typescript
- **Hot Reloading**: [Concurrently](https://github.com/open-cli-tools/concurrently) Hot realoding with concurrently
- **NoSQL database**: [MongoDB](https://www.mongodb.com) object data modeling using [Mongoose](https://mongoosejs.com)
- **Authentication and authorization**: using [passport](http://www.passportjs.org)
- **Validation**: request data validation using [Joi](https://github.com/hapijs/joi)
- **Logging**: using [winston](https://github.com/winstonjs/winston) and [morgan](https://github.com/expressjs/morgan)
- **Testing**: unit and integration tests using [Jest](https://jestjs.io)
- **Error handling**: centralized error handling mechanism
- **API documentation**: with [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc) and [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express)
- **Process management**: advanced production process management using [PM2](https://pm2.keymetrics.io)
- **Dependency management**: with [Yarn](https://yarnpkg.com)
- **Environment variables**: using [dotenv](https://github.com/motdotla/dotenv) and [cross-env](https://github.com/kentcdodds/cross-env#readme)
- **Security**: set security HTTP headers using [helmet](https://helmetjs.github.io)
- **Santizing**: sanitize request data against xss and query injection
- **CORS**: Cross-Origin Resource-Sharing enabled using [cors](https://github.com/expressjs/cors)
- **Compression**: gzip compression with [compression](https://github.com/expressjs/compression)
- **CI**: continuous integration with [GitHub CI](https://travis-ci.org)
- **Docker support**
- **Code coverage**: using [codecov](https://about.codecov.io/)
- **Code quality**: with [Codacy](https://www.codacy.com)
- **Git hooks**: with [husky](https://github.com/typicode/husky) and [lint-staged](https://github.com/okonet/lint-staged)
- **Linting**: with [ESLint](https://eslint.org) and [Prettier](https://prettier.io)
- **Editor config**: consistent editor configuration using [EditorConfig](https://editorconfig.org)
- **Changelog Generation**: with [Standard Version](https://github.com/conventional-changelog/standard-version)
- **Structured Commit Messages**: with [Commitizen](https://github.com/commitizen/cz-cli)
- **Commit Linting**: with [CommitLint](https://github.com/conventional-changelog/commitlint)

## Commands

Running locally:

```bash
yarn dev
```

Running in production:

```bash
yarn start
```

Compiling to JS from TS

```bash
yarn compile
```

Compiling to JS from TS in watch mode

```bash
yarn compile:watch
```

Commiting changes

```bash
yarn commit
```

Testing:

```bash
# run all tests
yarn test

# run TypeScript tests
yarn test:ts

# run JS tests
yarn test:js

# run all tests in watch mode
yarn test:watch

# run test coverage
yarn coverage
```

Docker:

```bash
# run docker container in development mode
yarn docker:dev

# run docker container in production mode
yarn docker:prod

# run all tests in a docker container
yarn docker:test
```

Linting:

```bash
# run ESLint
yarn lint

# fix ESLint errors
yarn lint:fix

# run prettier
yarn prettier

# fix prettier errors
yarn prettier:fix
```

## Making Changes

Run `yarn dev` so you can compile Typescript(.ts) files in watch mode

```bash
yarn dev
```

Add your changes to TypeScript(.ts) files which are in the src folder. The files will be automatically compiled to JS if you are in watch mode.

Add tests for the new feature

Run `yarn test:ts` to make sure all Typescript tests pass.

```bash
yarn test:ts
```

## Environment Variables

The environment variables can be found and modified in the `.env` file. They come with these default values:

```bash
# Port number
PORT=3000

# URL of the Mongo DB
MONGODB_URL=mongodb://127.0.0.1:27017/Park254_Backend

# JWT
# JWT secret key
JWT_SECRET=thisisasamplesecret
# Number of minutes after which an access token expires
JWT_ACCESS_EXPIRATION_MINUTES=30
# Number of days after which a refresh token expires
JWT_REFRESH_EXPIRATION_DAYS=30

# SMTP configuration options for the email service
# For testing, you can use a fake SMTP service like Ethereal: https://ethereal.email/create
SMTP_HOST=email-server
SMTP_PORT=587
SMTP_USERNAME=email-server-username
SMTP_PASSWORD=email-server-password
EMAIL_FROM=support@yourapp.com

# URL of client application
CLIENT_URL=http://localhost:5000
```

## Project Structure

```
.
├── src                             # Source files
│   ├── app.ts                        # Express App
│   ├── config                        # Environment variables and other configurations
│   ├── custom.d.ts                   # File for extending types from node modules
│   ├── declaration.d.ts              # File for declaring modules without types
│   ├── index.ts                      # App entry file
│   ├── modules                       # Modules such as models, controllers, services 
│   └── routes                        # Routes
├── TODO.md                         # TODO List
├── package.json
└── README.md
```

## API Documentation

To view the list of available APIs and their specifications, run the server and go to `http://localhost:3000/v1/docs` in your browser. This documentation page is automatically generated using the [swagger](https://swagger.io/) definitions written as comments in the route files.

### API Endpoints

List of available routes:

**Auth routes**:\
`POST /v1/auth/register` - register\
`POST /v1/auth/login` - login\
`POST /v1/auth/refresh-tokens` - refresh auth tokens\
`POST /v1/auth/forgot-password` - send reset password email\
`POST /v1/auth/reset-password` - reset password

**User routes**:\
`POST /v1/users` - create a user\
`GET /v1/users` - get all users\
`GET /v1/users/:userId` - get user\
`PATCH /v1/users/:userId` - update user\
`DELETE /v1/users/:userId` - delete user

## Error Handling

The app has a centralized error handling mechanism.

Controllers should try to catch the errors and forward them to the error handling middleware (by calling `next(error)`). For convenience, you can also wrap the controller inside the catchAsync utility wrapper, which forwards the error.

```javascript
const catchAsync = require('../utils/catchAsync');

const controller = catchAsync(async (req, res) => {
  // this error will be forwarded to the error handling middleware
  throw new Error('Something wrong happened');
});
```

The error handling middleware sends an error response, which has the following format:

```json
{
  "code": 404,
  "message": "Not found"
}
```

When running in development mode, the error response also contains the error stack.

The app has a utility ApiError class to which you can attach a response code and a message, and then throw it from anywhere (catchAsync will catch it).

For example, if you are trying to get a user from the DB who is not found, and you want to send a 404 error, the code should look something like:

```javascript
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

const getUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
};
```

## Validation

Request data is validated using [Joi](https://joi.dev/). Check the [documentation](https://joi.dev/api/) for more details on how to write Joi validation schemas.

The validation schemas are defined in the `src/validations` directory and are used in the routes by providing them as parameters to the `validate` middleware.

```javascript
const express = require('express');
const validate = require('../../middlewares/validate');
const userValidation = require('../../validations/user.validation');
const userController = require('../../controllers/user.controller');

const router = express.Router();

router.post('/users', validate(userValidation.createUser), userController.createUser);
```

## Authentication

To require authentication for certain routes, you can use the `auth` middleware.

```javascript
const express = require('express');
const auth = require('../../middlewares/auth');
const userController = require('../../controllers/user.controller');

const router = express.Router();

router.post('/users', auth(), userController.createUser);
```

These routes require a valid JWT access token in the Authorization request header using the Bearer schema. If the request does not contain a valid access token, an Unauthorized (401) error is thrown.

**Generating Access Tokens**:

An access token can be generated by making a successful call to the register (`POST /v1/auth/register`) or login (`POST /v1/auth/login`) endpoints. The response of these endpoints also contains refresh tokens (explained below).

An access token is valid for 30 minutes. You can modify this expiration time by changing the `JWT_ACCESS_EXPIRATION_MINUTES` environment variable in the .env file.

**Refreshing Access Tokens**:

After the access token expires, a new access token can be generated, by making a call to the refresh token endpoint (`POST /v1/auth/refresh-tokens`) and sending along a valid refresh token in the request body. This call returns a new access token and a new refresh token.

A refresh token is valid for 30 days. You can modify this expiration time by changing the `JWT_REFRESH_EXPIRATION_DAYS` environment variable in the .env file.

## Authorization

The `auth` middleware can also be used to require certain rights/permissions to access a route.

```javascript
const express = require('express');
const auth = require('../../middlewares/auth');
const userController = require('../../controllers/user.controller');

const router = express.Router();

router.post('/users', auth('manageUsers'), userController.createUser);
```

In the example above, an authenticated user can access this route only if that user has the `manageUsers` permission.

The permissions are role-based. You can view the permissions/rights of each role in the `src/config/roles.js` file.

If the user making the request does not have the required permissions to access this route, a Forbidden (403) error is thrown.

## Logging

Import the logger from `src/config/logger.js`. It is using the [Winston](https://github.com/winstonjs/winston) logging library.

Logging should be done according to the following severity levels (ascending order from most important to least important):

```javascript
const logger = require('<path to src>/config/logger');

logger.error('message'); // level 0
logger.warn('message'); // level 1
logger.info('message'); // level 2
logger.http('message'); // level 3
logger.verbose('message'); // level 4
logger.debug('message'); // level 5
```

In development mode, log messages of all severity levels will be printed to the console.

In production mode, only `info`, `warn`, and `error` logs will be printed to the console.\
It is up to the server (or process manager) to actually read them from the console and store them in log files.\
This app uses pm2 in production mode, which is already configured to store the logs in log files.

Note: API request information (request url, response code, timestamp, etc.) are also automatically logged (using [morgan](https://github.com/expressjs/morgan)).

## Custom Mongoose Plugins

The app also contains 2 custom mongoose plugins that you can attach to any mongoose model schema. You can find the plugins in `src/models/plugins`.

```javascript
const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const userSchema = mongoose.Schema(
  {
    /* schema definition here */
  },
  { timestamps: true }
);

userSchema.plugin(toJSON);
userSchema.plugin(paginate);

const User = mongoose.model('User', userSchema);
```

### toJSON

The toJSON plugin applies the following changes in the toJSON transform call:

- removes \_\_v, createdAt, updatedAt, and any schema path that has private: true
- replaces \_id with id

### paginate

The paginate plugin adds the `paginate` static method to the mongoose schema.

Adding this plugin to the `User` model schema will allow you to do the following:

```javascript
const queryUsers = async (filter, options) => {
  const users = await User.paginate(filter, options);
  return users;
};
```

The `filter` param is a regular mongo filter.

The `options` param can have the following (optional) fields:

```javascript
const options = {
  sortBy: 'name:desc', // sort order
  limit: 5, // maximum results per page
  page: 2, // page number
  projectBy: 'name:hide, role:hide', // fields to hide or include in the results
};
```

The `projectBy` option can include multiple criteria (separated by a comma) but cannot include and exclude fields at the same time. Check out the following examples:

  - [x] `name:hide, role:hide` should work
  - [x] `name:include, role:include` should work
  - [ ] `name:include, role:hide` will not work

The plugin also supports sorting by multiple criteria (separated by a comma): `sortBy: name:desc,role:asc`

The `paginate` method returns a Promise, which fulfills with an object having the following properties:

```json
{
  "results": [],
  "page": 2,
  "limit": 5,
  "totalPages": 10,
  "totalResults": 48
}
```

## Linting

Linting is done using [ESLint](https://eslint.org/) and [Prettier](https://prettier.io).

In this app, ESLint is configured to follow the [Airbnb JavaScript style guide](https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb-base) with some modifications. It also extends [eslint-config-prettier](https://github.com/prettier/eslint-config-prettier) to turn off all rules that are unnecessary or might conflict with Prettier.

To modify the ESLint configuration, update the `.eslintrc.json` file. To modify the Prettier configuration, update the `.prettierrc.json` file.

To prevent a certain file or directory from being linted, add it to `.eslintignore` and `.prettierignore`.

To maintain a consistent coding style across different IDEs, the project contains `.editorconfig`

## Contributing

Contributions are more than welcome! Please check out the [contributing guide](CONTRIBUTING.md).

## Inspirations

- [hagopj13/node-express-boilerplate](https://github.com/hagopj13/node-express-boilerplate.git)

## License

[MIT](LICENSE)
