# Backend — Student Management System

Node.js 20 REST API built with Express 5, containerized with Docker, deployed to **Azure Container Apps**.

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| Express | 5.2.1 | Web framework |
| mssql | 11.0.1 | SQL Server driver |
| jsonwebtoken | 9.0.2 | JWT authentication |
| bcryptjs | 2.4.3 | Password hashing |
| Joi | 17.13.3 | Request validation |
| express-rate-limit | 7.5.0 | Rate limiting |
| cors | 2.8.6 | CORS middleware |
| dotenv | 17.3.1 | Environment config |

### Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| Jest | 29.7.0 | Test runner |
| Supertest | 7.2.2 | HTTP testing |

## Scripts

```bash
npm start         # Start server (port 5000)
npm test          # Run 32 tests (Jest + Supertest)
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/profile` | Yes | Get profile |
| PUT | `/api/auth/profile` | Yes | Update profile |
| GET | `/api/students` | Yes | List students |
| POST | `/api/students` | Admin | Create student |
| PUT | `/api/students/:id` | Admin | Update student |
| DELETE | `/api/students/:id` | Admin | Delete student |
| GET | `/health` | No | Health check |

## Testing

32 tests across 4 suites — all use mocked database (no live DB required):

| Suite | File | Tests |
|---|---|---|
| Health | `health.test.js` | 2 |
| Auth | `auth.test.js` | 10 |
| Middleware | `middleware.test.js` | 7 |
| Students | `students.test.js` | 13 |

## Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Deployment

Deployed automatically via GitHub Actions:
1. Docker image built and tagged with Git SHA
2. Pushed to Docker Hub
3. Deployed to Azure Container Apps via `azure/container-apps-deploy-action@v1`

## Project Structure

```
├── app.js                    # Express app config + CORS
├── server.js                 # Entry point (port binding)
├── Dockerfile                # Container image definition
├── __tests__/                # 32 Jest tests
│   ├── health.test.js
│   ├── auth.test.js
│   ├── middleware.test.js
│   └── students.test.js
└── src/
    ├── config/db.js          # SQL Server connection pool
    ├── controllers/
    │   ├── authController.js
    │   └── studentController.js
    ├── middleware/
    │   └── authMiddleware.js  # JWT + role checking
    ├── models/
    │   ├── userModel.js
    │   └── studentModel.js
    └── routes/
        ├── authRoutes.js
        └── studentRoutes.js
```