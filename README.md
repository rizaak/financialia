# FinancialIA

Aplicación de finanzas personales: **API NestJS** (Prisma + PostgreSQL), **SPA React** (Vite + Tailwind) e identidad con **Auth0** (JWT RS256).

---

## Requisitos

| Herramienta | Versión orientativa |
|-------------|---------------------|
| Node.js     | 20 LTS o superior   |
| npm         | 10+                 |
| Docker      | Solo si usas Postgres local con Compose |

---

## Desarrollo local

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repo> financialia
cd financialia
npm install
```

`npm install` en la raíz instala el monorepo y ejecuta `prisma generate` (script `prepare`).

### 2. Base de datos (PostgreSQL)

Con Docker (recomendado en local):

```bash
npm run db:up
```

Esto levanta Postgres según `docker-compose.yml`. Ajusta credenciales si las cambias y alinea `DATABASE_URL` en `.env`.

### 3. Variables de entorno

- **Raíz del repo:** copia `.env.example` → `.env` y completa al menos `DATABASE_URL`, `AUTH0_ISSUER_URL` y `AUTH0_AUDIENCE`.
- **Web:** copia `apps/web/.env.example` → `apps/web/.env` y define `VITE_API_URL`, variables Auth0 (`VITE_AUTH0_*`) o, solo para pruebas sin SPA, `VITE_DEV_ACCESS_TOKEN`.

El **Audience** de Auth0 en el API (`AUTH0_AUDIENCE`) debe coincidir con `VITE_AUTH0_AUDIENCE` en la web. El **issuer** del API (`AUTH0_ISSUER_URL`) debe ser exactamente el claim `iss` del access token (incluido custom domain si lo usas).

### 4. Migraciones Prisma

```bash
npm run db:migrate
```

En un entorno ya creado, para aplicar migraciones pendientes sin modo interactivo:

```bash
npx prisma migrate deploy
```

### 5. Arrancar en desarrollo

En dos terminales:

```bash
npm run dev:api
```

```bash
npm run dev:web
```

- API: `http://localhost:3000` (o el puerto de `API_PORT`).
- Web: `http://localhost:5173` (Vite).

---

## Estructura del monorepo

```
financialia/
├── apps/
│   ├── api/          # NestJS — REST, JWT, Prisma
│   └── web/          # React + Vite + Tailwind
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docker-compose.yml
├── package.json      # workspaces npm
└── .env.example
```

---

## Scripts útiles (raíz)

| Script | Descripción |
|--------|-------------|
| `npm run dev:api` | API en modo watch |
| `npm run dev:web` | Frontend Vite |
| `npm run build:api` | Compila el API a `apps/api/dist` |
| `npm run build:web` | Compila la SPA a `apps/web/dist` |
| `npm run db:up` / `db:down` | Postgres con Docker |
| `npm run db:migrate` | `prisma migrate dev` |
| `npx prisma migrate deploy` | Aplicar migraciones (CI / producción) |

---

## Despliegue a producción

### Resumen

1. **PostgreSQL** gestionado (RDS, Cloud SQL, Neon, etc.) con cadena `DATABASE_URL`.
2. **API** como proceso Node (PM2, systemd, Fly.io, Railway, ECS, etc.) o contenedor propio.
3. **Web** como archivos estáticos (S3 + CloudFront, Vercel, Netlify, nginx) sirviendo `apps/web/dist`.
4. **Auth0:** aplicación SPA + API en el dashboard; URLs de callback y logout apuntando a tu dominio de producción.
5. **CORS:** en el API, `FRONTEND_ORIGIN` debe ser el origen exacto del front (p. ej. `https://app.tudominio.com`), sin barra final.

### Compilar

```bash
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build:api
npm run build:web
```

### API (Nest)

- Variables mínimas: `DATABASE_URL`, `AUTH0_ISSUER_URL`, `AUTH0_AUDIENCE`, `FRONTEND_ORIGIN`, `API_PORT` (o el puerto que exponga el proxy).
- Comando de arranque: `node dist/main.js` desde `apps/api` tras el build, o `npm run start:prod -w @financial-ia/api` si el cwd es la raíz y el artefacto está generado.

### Web (Vite)

- En build, fija `VITE_API_URL` al URL público del API (p. ej. `https://api.tudominio.com`).
- Genera el bundle: `npm run build:web`.
- Sirve el contenido de `apps/web/dist` como sitio estático; configura fallback a `index.html` para rutas del cliente (React Router).

### Seguridad

- No subas `.env` con secretos al repositorio.
- Rota credenciales de base de datos y revisa permisos de red (solo el API debe alcanzar Postgres).
- Usa HTTPS en front y API en producción.

---

## Soporte y convenciones

- Esquema de datos y migraciones: carpeta `prisma/`.
- Reglas opcionales para asistentes de código: `.cursorrules`.

Para dudas de Auth0 o Prisma, consulta la documentación oficial de cada servicio.
