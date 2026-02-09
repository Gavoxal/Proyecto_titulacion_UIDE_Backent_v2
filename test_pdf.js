import fetch from 'node-fetch';
import fs from 'fs';

const TOKEN = 'PONER_AQUI_UN_TOKEN_VALIDO'; // Tendría que obtener uno real o saltar auth para probar
const FILE_NAME = '1770586571331-TA-3.1-Grupo.pdf';
const URL = `http://localhost:3000/api/v1/propuestas/file/${FILE_NAME}`;

async function testDownload() {
    /*
     # Plan de Acción: Revisión Robusta y Votación Académica

    Se corregirán los errores de validación al guardar revisiones y se reintegrará la información de los tutores en el panel del Director.

    ## Cambios Propuestos

    ### 1. Sincronización de Enums (Backend & Frontend)
    - **Backend ([propuesta.routes.ts](file:///c:/Users/ASUS/Documents/UIDE/4 semestre/Programacion de Mildewer/Proyecto_correcion/api_titulacion/src/routes/propuestas/propuesta.routes.ts))**: Actualizar el `enum` en el esquema de validación para usar `APROBADA`, `RECHAZADA` y `APROBADA_CON_COMENTARIOS` (consistente con el modelo Prisma).
    - **Backend ([propuesta.controller.ts](file:///c:/Users/ASUS/Documents/UIDE/4 semestre/Programacion de Mildewer/Proyecto_correcion/api_titulacion/src/controllers/propuesta.controller.ts))**: Ajustar las comparaciones de `estadoRevision` para que coincidan con los nuevos valores.

    ### 2. Integración de Votación de Tutores
    - **Backend ([propuesta.controller.ts](file:///c:/Users/ASUS/Documents/UIDE/4 semestre/Programacion de Mildewer/Proyecto_correcion/api_titulacion/src/controllers/propuesta.controller.ts))**: Incluir `votacionesTutor` (con el perfil del tutor) en la respuesta de `getPropuestas` para directores.
    - **Frontend ([ProposalDetail.jsx](file:///c:/Users/ASUS/Documents/UIDE/4 semestre/Programacion de Mildewer/Proyecto_correcion/trabajo-titulacion-uide-main/src/pages/Director/ProposalDetail.jsx))**:
        - Mapear los votos de los tutores desde la API.
        - Añadir una sección visual para mostrar la prioridad dada por cada tutor y sus comentarios de justificación.

    ## Verificación
    1. Guardar una revisión como Director y verificar que no hay errores 400.
    2. Verificar que el Estudiante visualiza su propuesta aprobada.
    3. Confirmar que los votos de los tutores aparecen correctamente en el detalle.
    */
    console.log(`Testing download from ${URL}`);
    const response = await fetch(URL, {
        headers: {
            'Authorization': `Bearer ${TOKEN}`
        }
    });

    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);

    if (response.ok) {
        const buffer = await response.buffer();
        fs.writeFileSync('test_download.pdf', buffer);
        console.log(`File saved as test_download.pdf (Size: ${buffer.length})`);
    } else {
        const text = await response.text();
        console.log(`Error body: ${text}`);
    }
}

testDownload();
