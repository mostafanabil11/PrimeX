# PrimeX API — Backend

A NestJS REST API for the PrimeX gym platform — memberships, classes, trainers
and the admin back office — on MongoDB with JWT authentication.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB (running locally or remote connection)

## Installation

1. Navigate to the Backend folder:
```bash
cd Backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file by copying `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/primex
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_EXPIRATION=7d
```

## Running the Application

### Development mode (with hot reload):
```bash
npm run start:dev
```

### Production mode:
```bash
npm run build
npm run start:prod
```

### Debug mode:
```bash
npm run start:debug
```

The API will be available at `http://localhost:3000`

## API Documentation

Swagger documentation is available at `http://localhost:3000/api`

## Available Endpoints

### Auth
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `GET /auth/profile` - Get user profile (requires JWT token)

### Health
- `GET /health` - Health check endpoint
- `GET /` - Welcome message

## Project Structure

```
src/
├── main.ts              # Application entry point
├── app.module.ts        # Root module
├── app.controller.ts    # Root controller
├── app.service.ts       # Root service
├── config/              # Configuration services
│   └── config.service.ts
└── auth/                # Authentication module
    ├── auth.module.ts
    ├── auth.controller.ts
    ├── auth.service.ts
    ├── dto/
    │   ├── login.dto.ts
    │   └── register.dto.ts
    ├── guards/
    │   └── jwt-auth.guard.ts
    ├── schemas/
    │   └── user.schema.ts
    └── strategies/
        └── jwt.strategy.ts
```

## Available Commands

- `npm run start` - Start the application
- `npm run start:dev` - Start with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run start:prod` - Start production build
- `npm run build` - Build the project
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage

## Environment Variables

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key for token signing
- `JWT_EXPIRATION` - JWT token expiration time

## Technologies

- **NestJS** - Progressive Node.js framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - JSON Web Token authentication
- **Passport** - Authentication middleware
- **Swagger** - API documentation
- **TypeScript** - Typed JavaScript
- **Jest** - Testing framework

## Next Steps

1. Set up MongoDB connection
2. Customize user schema with additional fields
3. Add more modules (products, orders, etc.)
4. Implement role-based access control
5. Add request validation and error handling
6. Implement API rate limiting
7. Add logging and monitoring

## License

MIT
