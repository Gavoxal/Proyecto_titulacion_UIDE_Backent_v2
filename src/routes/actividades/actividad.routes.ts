import {
    createActividad,
    getActividadesByPropuesta,
    getActividadById,
    updateActividad,
    deleteActividad,
    createEvidencia,
    getEvidenciaById,
    updateEvidencia,
    deleteEvidencia,
    updateEvidenciaNota
} from '../../controllers/actividad.controller.js';
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance, opts: any) {

    fastify.addHook('onRequest', fastify.authenticate);

    // Esquemas
    const actividadSchema = {
        type: 'object',
        properties: {
            idActividades: { type: 'integer' },
            nombre: { type: 'string' },
            descripcion: { type: 'string' },
            evidencias: { type: 'array', items: { type: 'object', additionalProperties: true } }
        }
    };

    const evidenciaSchema = {
        type: 'object',
        properties: {
            id: { type: 'integer' },
            semana: { type: 'integer' },
            contenido: { type: 'string' },
            calificacion: { type: 'number' },
            estado: { type: 'string' }
        }
    };

    // --- RUTAS ACTIVIDADES ---

    // POST / (Crear Actividad)
    fastify.post('/', {
        schema: {
            tags: ['Actividades'],
            description: 'Crear nueva actividad (semanal)',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['nombre', 'propuestasId'],
                properties: {
                    nombre: { type: 'string' },
                    descripcion: { type: 'string' },
                    propuestasId: { type: 'integer' }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            if (user.rol === 'ESTUDIANTE') {
                return reply.code(403).send({ message: 'Estudiantes no pueden crear actividades' });
            }
        }
    }, createActividad);

    // GET /propuesta/:propuestaId (Listar Actividades)
    fastify.get('/propuesta/:propuestaId', {
        schema: {
            tags: ['Actividades'],
            description: 'Listar actividades de una propuesta',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { propuestaId: { type: 'integer' } }
            },
            response: {
                200: {
                    type: 'array',
                    items: actividadSchema
                }
            }
        }
    }, getActividadesByPropuesta);

    // GET /:id (Get One)
    fastify.get('/:id', {
        schema: {
            tags: ['Actividades'],
            description: 'Obtener actividad por ID',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            },
            response: { 200: actividadSchema }
        }
    }, getActividadById);

    // PUT /:id (Update)
    fastify.put('/:id', {
        schema: {
            tags: ['Actividades'],
            description: 'Actualizar actividad',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            },
            body: {
                type: 'object',
                properties: {
                    nombre: { type: 'string' },
                    descripcion: { type: 'string' }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            if (user.rol === 'ESTUDIANTE') {
                return reply.code(403).send({ message: 'Estudiantes no pueden actualizar actividades' });
            }
        }
    }, updateActividad);

    // DELETE /:id (Delete)
    fastify.delete('/:id', {
        schema: {
            tags: ['Actividades'],
            description: 'Eliminar actividad',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            if (user.rol === 'ESTUDIANTE') {
                return reply.code(403).send({ message: 'Estudiantes no pueden eliminar actividades' });
            }
        }
    }, deleteActividad);


    // --- RUTAS EVIDENCIAS ---

    // POST /:actividadId/evidencias (Subir Evidencia)
    fastify.post('/:actividadId/evidencias', {
        schema: {
            tags: ['Evidencias'],
            description: 'Subir evidencia (Solo estudiantes)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { actividadId: { type: 'integer' } }
            },
            body: {
                type: 'object',
                required: ['semana', 'contenido'],
                properties: {
                    semana: { type: 'integer' },
                    contenido: { type: 'string' },
                    archivoUrl: { type: 'string' }
                }
            },
            response: {
                201: evidenciaSchema
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            // "un estudiante... si [puede] subir evidencias"
            // "docente... no puede hacer post"
            if (user.rol !== 'ESTUDIANTE') {
                return reply.code(403).send({ message: 'Solo estudiantes pueden subir evidencias' });
            }
        }
    }, createEvidencia);

    // GET /evidencias/:id
    fastify.get('/evidencias/:id', {
        schema: {
            tags: ['Evidencias'],
            description: 'Obtener evidencia por ID',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            },
            response: { 200: evidenciaSchema }
        }
    }, getEvidenciaById);

    // PUT /evidencias/:id (Update - Estudiante edita contenido, Docente NO)
    fastify.put('/evidencias/:id', {
        schema: {
            tags: ['Evidencias'],
            description: 'Actualizar contenido de evidencia (Solo estudiante)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            },
            body: {
                type: 'object',
                properties: {
                    contenido: { type: 'string' },
                    archivoUrl: { type: 'string' }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            // "docente... puede hacer get, put pero no puede hacer post ni borras" -> PUT se refiere a CALIFICAR?
            // User dijo: "docente... puede hacer get, put". 
            // Normalmente PUT /evidencias/:id es para editar el contenido. Calificar es otro endpoint.
            // Asumire que Docente NO edita el contenido del archivo del estudiante. Solo estudiante edita su archivo.
            if (user.rol !== 'ESTUDIANTE') {
                return reply.code(403).send({ message: 'Solo el estudiante puede editar el contenido de la evidencia' });
            }
        }
    }, updateEvidencia);

    // DELETE /evidencias/:id
    fastify.delete('/evidencias/:id', {
        schema: {
            tags: ['Evidencias'],
            description: 'Eliminar evidencia',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            }
        },
        preHandler: async (request: any, reply: any) => {
            // "docente... no puede hacer post ni borras"
            // Estudiante "no puede eliminar cosas" (dicho al principio).
            // Entonces NADIE borra evidencias? O solo Director?
            const user = request.user;
            const allowed = ['DIRECTOR', 'COORDINADOR'];
            if (!allowed.includes(user.rol)) {
                return reply.code(403).send({ message: 'No tienes permisos para eliminar evidencias' });
            }
        }
    }, deleteEvidencia);

    // PUT /evidencias/:id/calificar (Calificar Evidencia)
    fastify.put('/evidencias/:id/calificar', {
        schema: {
            tags: ['Evidencias'],
            description: 'Calificar evidencia y agregar comentario',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            },
            body: {
                type: 'object',
                properties: {
                    calificacion: { type: 'number', minimum: 0, maximum: 10 },
                    comentarios: { type: 'string' }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            const allowed = ['TUTOR', 'DIRECTOR', 'DOCENTE_INTEGRACION', 'COMITE', 'PRESIDENTE'];
            if (!allowed.includes(user.rol)) {
                return reply.code(403).send({ message: 'No tienes permisos para calificar' });
            }
        }
    }, updateEvidenciaNota);

}
