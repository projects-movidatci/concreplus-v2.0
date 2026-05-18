# ConcrePlus / Elstar — Frontend

Aplicación web **React + Vite + TypeScript** (plantilla Elstar). Consume una API REST externa; en este equipo suele usarse el repo **Api_concreto** o, en local, la API TypeScript en la carpeta **`api/`** (ver [`api/README.md`](api/README.md)).

## Requisitos

- **Node.js** 18 o superior (recomendado LTS)
- **npm**

## Instalar dependencias

```bash
npm install
```

## Variables de entorno

```bash
copy .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

| Variable | Descripción |
|----------|-------------|
| `VITE_APP_API_PREFIX` | URL base de la API **sin barra final**. Ejemplos: `http://localhost:3000` (Api_concreto), `http://localhost:4000` (API en `demo/api`). |

Tras cambiar `.env`, reinicia el servidor de Vite.

## Comandos

| Comando | Descripción |
|---------|-------------|
| `npm start` | Desarrollo (Vite; suele ser `http://localhost:5173`). |
| `npm run build` | Build de producción (salida en `build/`). |
| `npm run preview` | Sirve el build localmente. |

## Enlazar con el backend

1. Arranca la API (repositorio **Api_concreto** o `npm run dev` dentro de `demo/api`).
2. En `.env`, pon `VITE_APP_API_PREFIX` con la misma URL y puerto que use el navegador para llamar a la API.
3. En producción, define `VITE_APP_API_PREFIX` con la URL pública **HTTPS** de la API al construir el front (`npm run build`).

Documentación de **API y base de datos** (incluida la de esta carpeta `api/`): [`api/README.md`](api/README.md).
