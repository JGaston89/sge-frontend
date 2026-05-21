# Dependencias del proyecto SGE Frontend

Este proyecto usa **Vite + React + TypeScript**. Después de clonar el repositorio, instala todas las dependencias con:

```bash
npm install
```

---

## Dependencias de producción

| Paquete | Versión | Descripción |
|---|---|---|
| `react` | ^19.2.5 | Biblioteca principal de UI |
| `react-dom` | ^19.2.5 | Renderizado de React en el DOM |
| `react-router-dom` | ^7.15.0 | Enrutamiento del lado del cliente |
| `@tanstack/react-query` | ^5.100.9 | Manejo de estado del servidor y caché de peticiones |
| `axios` | ^1.16.0 | Cliente HTTP para peticiones a la API |
| `lucide-react` | ^1.16.0 | Iconos SVG como componentes React |
| `libphonenumber-js` | ^1.13.2 | Validación y formateo de números de teléfono |

## Dependencias de desarrollo

| Paquete | Versión | Descripción |
|---|---|---|
| `vite` | ^8.0.10 | Bundler y servidor de desarrollo |
| `typescript` | ~6.0.2 | Superset tipado de JavaScript |
| `@vitejs/plugin-react` | ^6.0.1 | Plugin de Vite para React (Fast Refresh) |
| `eslint` | ^10.2.1 | Linter de código |
| `eslint-plugin-react-hooks` | ^7.1.1 | Reglas ESLint para React Hooks |
| `eslint-plugin-react-refresh` | ^0.5.2 | Reglas ESLint para React Refresh |
| `@types/react` | ^19.2.14 | Tipos TypeScript para React |
| `@types/react-dom` | ^19.2.3 | Tipos TypeScript para React DOM |
| `@types/node` | ^24.12.2 | Tipos TypeScript para Node.js |
| `typescript-eslint` | ^8.58.2 | Integración de TypeScript con ESLint |
| `globals` | ^17.5.0 | Variables globales para ESLint |
| `@eslint/js` | ^10.0.1 | Configuración base de ESLint para JavaScript |

---

## Scripts disponibles

```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Previsualizar el build de producción
npm run preview

# Ejecutar el linter
npm run lint
```

---

## Requisitos previos

- **Node.js** >= 18.x
- **npm** >= 9.x
