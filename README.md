# TrueGear

Frontend for the TrueGear vehicle workshop management system. Role-based SPA used by security, QC inspectors, service advisors, parts managers, and admins to run the full workshop flow from gate entry through billing.

## Stack

- **Framework:** React 19 + TypeScript
- **Build:** Vite 7
- **Routing:** React Router v6
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`)
- **HTTP:** Axios
- **Icons:** lucide-react
- **Toasts:** react-hot-toast
- **Signatures:** react-signature-canvas
- **Dates:** date-fns

## Getting started

```bash
npm install
npm run dev          # Vite dev server (default http://localhost:5173)
```

Configure the backend API base URL in [src/api/](src/api/) (or via env, depending on setup). The backend lives in [../WorkShopBackend/](../WorkShopBackend/).

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Project layout

```
src/
├── main.tsx              # Entry
├── App.tsx               # Root component / router host
├── routes/               # Route definitions
├── layouts/              # Shared layouts (sidebar, header, etc.)
├── screens/              # Page-level components by domain
│   ├── auth/
│   ├── dashboard/        # Vehicle 360, KPIs, etc.
│   ├── vehicles/
│   ├── customers/
│   ├── appointments/
│   ├── admin/
│   ├── settings/
│   └── profile/
├── components/           # Reusable UI components
├── context/              # React contexts (auth, theme, etc.)
├── store/                # Client-side state
├── hooks/                # Custom hooks
├── api/                  # Axios clients + endpoint wrappers
├── constants/            # Static config and lookups
├── types/                # Shared TypeScript types
├── utils/                # Helpers
└── assets/               # Static assets
```

## Deployment

Vercel is wired up via [vercel.json](vercel.json). `npm run build` produces a static `dist/` that any static host can serve.

## Backend

API: [../WorkShopBackend/](../WorkShopBackend/). See its README for endpoints and DB schema.
