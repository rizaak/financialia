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

---

## CI/CD: Railway (API) + Netlify (web) + GitHub Actions

### Cuándo corre cada cosa

| Momento | Qué pasa |
|---------|-----------|
| **Cuando se mezcla** un PR a `main` (botón *Merge* en GitHub) | GitHub registra un **push** en `main` → se ejecuta **Deploy production** (migraciones, Netlify producción, hook de Railway). |
| **Push directo a `main`** (sin PR) | Igual: mismo workflow de producción. |
| **Mientras el PR está abierto** (cada push a la rama del PR) | Solo el workflow **PR preview**: build + Netlify *draft* con alias `pr-<número>`. **No** despliega producción hasta que mezcles. |

En resumen: **producción = después del merge a `main`**; **preview = antes, en el PR**.

Archivos en el repo:

| Archivo | Uso |
|---------|-----|
| `railway.toml` | Build/start del API en Railway desde la raíz del monorepo |
| `apps/web/netlify.toml` | `publish = apps/web/dist` (respecto a la raíz del repo) y redirects SPA; en Actions el CLI usa `cwd` `apps/web` y `--dir=${{ github.workspace }}/apps/web/dist` (rutas relativas en `--dir` se resuelven desde la raíz del repo) |
| `.github/workflows/deploy-production.yml` | Build API → migraciones → Netlify; Railway despliega el API tras CI (**Wait for CI**) |
| `.github/workflows/pull-request-preview.yml` | Build + Netlify draft por PR |

### 1. Railway (API + Postgres)

1. Crea un proyecto en [Railway](https://railway.app) y añade **PostgreSQL**.
2. Crea un servicio desde **GitHub** con este repositorio; **root directory** en la raíz (donde está `package.json`).
3. En **Variables** del servicio del API, define al menos:
   - `DATABASE_URL` (Railway suele inyectarla al vincular Postgres; comprueba que apunte al plugin correcto).
   - `AUTH0_ISSUER_URL`, `AUTH0_AUDIENCE`
   - `FRONTEND_ORIGIN` = URL pública del sitio Netlify (origen exacto, sin barra final), para CORS.
   - Opcional: `API_PORT` no es necesario si usas el puerto que Railway asigna; la app usa `PORT` o `API_PORT`.
4. El archivo `railway.toml` indica `buildCommand` y `startCommand` para Prisma + Nest.
5. **Wait for CI (recomendado):** en el servicio del API, en los ajustes del **origen GitHub** / despliegue, activa **Wait for CI**. Requisitos: el workflow en `.github/workflows/deploy-production.yml` debe dispararse con `on: push: branches: [main]` (ya es así). Así Railway **no construye** el API hasta que GitHub Actions termine **correctamente** (migraciones aplicadas y Netlify subido). Evita desplegar código nuevo contra un esquema viejo y no necesitas *Deploy Hook* ni secret `RAILWAY_DEPLOY_HOOK_URL`.

**Importante:** con **Wait for CI** + deploy por Git en `main`, un solo flujo basta: no actives además un segundo disparador (p. ej. hook manual) o duplicarás deploys.

### 2. Netlify (SPA)

1. Crea un sitio en [Netlify](https://www.netlify.com) (puedes importar el repo o crear vacío y desplegar solo por CLI).
2. Si **conectas el repo** en Netlify en lugar de usar solo Actions: **Base directory** = `apps/web`, **Build command** = `cd ../.. && npm ci && npm run build:web`, **Publish directory** = `apps/web/dist` (o `dist` si la base ya es `apps/web`).
3. Obtén **Site ID** (Site settings → General) y un **Personal access token** (User settings → Applications).
4. En Auth0, añade la URL de producción (y la de preview si aplica) en *Allowed Callback URLs*, *Logout* y *Web Origins*.

El workflow de GitHub Actions usa `--site=$NETLIFY_SITE_ID` y `working-directory: apps/web` para que el CLI no intente elegir entre los paquetes `@financial-ia/api` y `@financial-ia/web`.

### 3. Secretos en GitHub

Ruta: repositorio → **Settings → Secrets and variables → Actions → New repository secret**.

Los valores suelen ser **los mismos** que ya usas en producción (Railway, Netlify build, Auth0). No inventes nombres: deben coincidir con lo que pide el workflow.

| Secreto | Para qué sirve en CI | De dónde sacas el valor |
|---------|----------------------|---------------------------|
| **`DATABASE_URL`** | `prisma migrate deploy` contra la base de **producción** | **Railway:** abre el plugin **Postgres** → pestaña **Variables** (o **Connect**) → copia la URL `DATABASE_URL` / *Postgres Connection URL*. Debe ser la misma que usa el servicio del API en Railway. |
| **`NETLIFY_AUTH_TOKEN`** | Que el CLI de Netlify pueda subir el build | **Netlify:** [User settings → Applications → Personal access tokens](https://app.netlify.com/user/applications) → *New access token* → copia el token (solo se muestra una vez). |
| **`NETLIFY_SITE_ID`** | Indicar a qué sitio subir los archivos | **Netlify:** tu sitio → **Site configuration → General** → *Site details* → **Site ID** (UUID). |
| **`VITE_API_URL`** | URL pública del API en el bundle del front (sin `/` final recomendado) | La URL que Railway (u otro host) te da para el API, p. ej. `https://tu-api.up.railway.app`. Misma idea que `VITE_API_URL` en `apps/web/.env` local, pero con dominio de producción. |
| **`VITE_AUTH0_DOMAIN`** | Dominio del tenant Auth0 de la SPA | **Auth0:** [Dashboard](https://manage.auth0.com/) → *Applications* → tu app **Single Page Application** → pestaña *Settings* → campo **Domain** (ej. `dev-xxx.us.auth0.com` o tu custom domain). Igual que en `apps/web/.env`. |
| **`VITE_AUTH0_CLIENT_ID`** | Client ID de la aplicación SPA | **Auth0:** misma app SPA → **Client ID** en *Settings*. |
| **`VITE_AUTH0_AUDIENCE`** | Identificador de la API que protege el backend | **Auth0:** *Applications → APIs* → tu API → **Identifier** (URL que definiste como audience). Debe ser **idéntico** a `AUTH0_AUDIENCE` en Railway (API Nest). |

**Variables que no van en GitHub Actions** (las pones en Railway, no en esta tabla): `AUTH0_ISSUER_URL`, `AUTH0_AUDIENCE`, `FRONTEND_ORIGIN` en el servicio del API — salen de Auth0 (issuer = URL del tenant / custom domain) y de la URL pública de tu sitio en Netlify.

**Auth0 y CORS:** en Railway, `FRONTEND_ORIGIN` debe ser exactamente el origen del front (ej. `https://tu-app.netlify.app`).

**Previews de PR:** los mismos `VITE_*` suelen apuntar a producción; si quieres un API de staging, añade otros secretos y cámbialos solo en `pull-request-preview.yml`.

### 4. Orden del workflow de producción

1. **build-api:** `npm ci` + `prisma generate` + `build:api` (mismo criterio que `railway.toml`). Si el build falla aquí, el workflow falla y **Wait for CI** impide que Railway arranque un build que ya sabemos que rompe.
2. **db-migrate:** solo si el build del API fue bien (`needs: build-api`): `prisma migrate deploy` con `DATABASE_URL`.
3. **deploy-web:** solo si *migrate* fue bien (`needs: db-migrate`): build + Netlify producción.
4. **Railway (API):** con **Wait for CI**, el deploy en Railway espera a que todo lo anterior termine en verde; entonces construye y arranca el API (mismo código que ya compiló en el paso 1).
