# Frontend — Student Management System

React 18 SPA built with Vite 5, deployed to **Cloudflare Pages**.

## Tech Stack

| Package | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| Vite | 5.4.21 | Build tool |
| React Router DOM | 6.30.3 | Client-side routing |
| Axios | 1.13.6 | HTTP client for API calls |
| Zod | 3.23.8 | Form validation |
| React Hot Toast | 2.5.2 | Toast notifications |

## Scripts

```bash
npm run dev       # Start dev server (port 5173)
npm run build     # Production build to dist/
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL (injected at build time) |

## Deployment

Deployed automatically via GitHub Actions using `cloudflare/pages-action@v1`. Production deploys from `main` branch, preview deploys from other branches.

## Project Structure

```
src/
├── App.jsx                # Root component + routing
├── main.jsx               # React DOM mount
├── index.css              # Global styles
├── pages/                 # Page components
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── Dashboard.jsx
│   ├── GetStudents.jsx
│   ├── CreateStudent.jsx
│   └── UpdateStudent.jsx
└── services/
    └── api.js             # Axios HTTP client
```