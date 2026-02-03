# API Titulación - Sistema de Gestión

Este proyecto implementa el backend para el Sistema de Gestión de Titulación de la UIDE. Incluye una API REST Fastify, un esquema de datos normalizado y un Servidor MCP para integración con Inteligencia Artificial.

## 🗄️ Base de Datos y Schema (Actualizado)

Se ha refactorizado la base de datos para mejorar la seguridad, la normalización y escalabilidad.

### 1. Normalización de Usuarios
Se separó la entidad de usuario en dos tablas para desacoplar identidad de autenticación:
*   **`Usuario` (Tabla `usuarios`):** Contiene datos personales y rol (`id`, `cedula`, `nombres`, `apellidos`, `correoInstitucional`, `rol`).
*   **`Auth` (Tabla `auth`):** Contiene credenciales de acceso (`username`, `password` hasheada) vinculadas 1:1 con `Usuario`.

### 2. Perfiles Específicos
*   **`Estudiante` (Tabla `estudiantes_perfil`):** Se creó una tabla dedicada para información académica específica, evitando saturar la tabla principal de usuarios. Incluye:
    *   `codigoMalla`, `malla`, `escuela`, `sede`.
    *   Ubicación (`ciudad`, `provincia`, `pais`).
    *   Relación 1:1 con `Usuario`.

### 3. Gestión de Propuestas y Comités
*   **Propuestas:** Ahora incluye relación directa y explícita con el `Tutor` (`tutorId`).
*   **Entregables Finales:** Nueva tabla `entregables_finales` para gestionar Tesis, Manuales y Artículos asociados a una propuesta.
*   **Comité:** Refactorización para asignar jurados y presidentes a las propuestas con mejor trazabilidad de calificaciones.

### 4. Lógica de Seguridad (RLS) en BD
Además de las tablas, se programó lógica "inteligente" en la base de datos para el soporte de IA:
*   **Vista `v_usuarios_rls`:** Una "capa virtual" que intercepta las consultas.
*   **Función `get_app_role()`:** Función determinística que lee la variable de sesión `@app_current_role`.
*   **Regla:** `SELECT * FROM usuarios WHERE get_app_role() = 'DIRECTOR'`. Esto asegura que el agente MCP solo vea datos si ha autenticado su "intención" correctamente.

---

## 🚀 Últimas Actualizaciones

### 1. Corrección Importación de Estudiantes
*   **Problema:** Los archivos Excel con filas de "título" antes de los encabezados fallaban.
*   **Solución:** Se implementó una lógica de detección inteligente en `estudiante.controller.ts`. Ahora el sistema busca automáticamente la fila que contiene la columna "Cédula" y procesa los datos desde allí, ignorando títulos o celdas vacías superiores.
*   **Mejora:** Separación automática de "Nombre Completo" en Nombres y Apellidos.

### 2. Implementación MCP (Model Context Protocol)
Se ha integrado un servidor MCP para permitir que asistentes de IA (como Claude Desktop) interactúen con la base de datos de forma controlada.
*   **Archivo:** `src/mcp-server.js`
*   **Funcionalidad:** Provee herramientas como `ver_usuarios` que permiten consultas en lenguaje natural.

### 3. Seguridad RLS (Row-Level Security)
Para asegurar que la IA no acceda a datos indebidos, se implementó un esquema de seguridad en la base de datos MySQL:
*   **Usuario Restringido:** `mcp_agent` (Solo lectura).
*   **Vista Segura:** `v_usuarios_rls`.
*   **Mecanismo:** La vista filtra dinámicamente las filas basándose en una variable de sesión `@app_current_role`. La IA debe "simular" un rol para ver datos, y la BD decide qué mostrar.

---

## 🛠️ Guía de Configuración

### Prerrequisitos
*   Node.js (v18+)
*   MySQL

### Instalación
1.  Instalar dependencias:
    ```bash
    npm install
    ```
2.  Configurar variables de entorno en `.env`.
3.  **SETUP DE SEGURIDAD (Obligatorio para MCP):**
    Ejecutar el script que crea el usuario agente y las vistas de seguridad:
    ```bash
    node scripts/setup_rls.js
    ```

### Ejecución
*   **API Dev Servers:**
    ```bash
    npm run dev
    ```
*   **Servidor MCP (Manual):**
    ```bash
    npm run mcp
    ```

---

## 🤖 Integración con Claude Desktop

Para usar las herramientas de este proyecto en Claude, edita tu archivo:
`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "api-titulacion": {
      "command": "node",
      "args": [
        "C:\\Ruta\\Absoluta\\A\\Su\\Proyecto\\api_titulacion\\src\\mcp-server.js"
      ]
    }
  }
}
```

---

## 📝 Notas de Desarrollo

*   **Documentación de Código:** Se han agregado comentarios explicativos detallados en `src/mcp-server.js` y `scripts/setup_rls.js` para facilitar el entendimiento del flujo de seguridad.
*   **Seguridad:** En un entorno de producción, las contraseñas hardcodeadas en los scripts de configuración deben moverse a variables de entorno (`.env`).
