import {
    getAllReuniones,
    createReunion,
    getReunionById,
    getReunionesByTutor,
    getReunionesByEstudiante,
    getReunionesByPropuesta,
    updateReunion,
    deleteReunion
} from '../../controllers/bitacora.controller.js';
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance, opts: any) {

    fastify.addHook('onRequest', fastify.authenticate);

    // GET / (Obtener todas las reuniones - Contextual al usuario)
    fastify.get('/', {
        schema: {
            tags: ['Bitácora de Reuniones'],
            description: 'Obtener reuniones (Contextual al rol del usuario)',
            security: [{ bearerAuth: [] }]
        }
    }, getAllReuniones);

    // POST / (Crear reunión)
    fastify.post('/', {
        schema: {
            tags: ['Bitácora de Reuniones'],
            description: 'Crear nueva reunión (Solo TUTOR)',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['estudianteId', 'propuestaId', 'fecha', 'horaInicio', 'horaFin', 'modalidad', 'motivo'],
                properties: {
                    estudianteId: { type: 'integer' },
                    propuestaId: { type: 'integer' },
                    fecha: { type: 'string', format: 'date' },
                    horaInicio: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
                    horaFin: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
                    modalidad: { type: 'string', enum: ['PRESENCIAL', 'VIRTUAL', 'HIBRIDA'] },
                    motivo: { type: 'string' },
                    resumen: { type: 'string' },
                    compromisos: { type: 'array', items: { type: 'string' } },
                    asistio: { type: 'boolean' }
                }
            }
        }
    }, createReunion);

    // GET /:id (Obtener reunión por ID)
    fastify.get('/:id', {
        schema: {
            tags: ['Bitácora de Reuniones'],
            description: 'Obtener reunión por ID',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            }
        }
    }, getReunionById);

    // GET /tutor/:tutorId (Obtener reuniones por tutor)
    fastify.get('/tutor/:tutorId', {
        schema: {
            tags: ['Bitácora de Reuniones'],
            description: 'Obtener reuniones por tutor',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { tutorId: { type: 'integer' } }
            }
        }
    }, getReunionesByTutor);

    // GET /estudiante/:estudianteId (Obtener reuniones por estudiante)
    fastify.get('/estudiante/:estudianteId', {
        schema: {
            tags: ['Bitácora de Reuniones'],
            description: 'Obtener reuniones por estudiante',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { estudianteId: { type: 'integer' } }
            }
        }
    }, getReunionesByEstudiante);

    // GET /propuesta/:propuestaId (Obtener reuniones por propuesta)
    fastify.get('/propuesta/:propuestaId', {
        schema: {
            tags: ['Bitácora de Reuniones'],
            description: 'Obtener reuniones por propuesta',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { propuestaId: { type: 'integer' } }
            }
        }
    }, getReunionesByPropuesta);

    // PUT /:id (Actualizar reunión)
    fastify.put('/:id', {
        schema: {
            tags: ['Bitácora de Reuniones'],
            description: 'Actualizar reunión (Solo TUTOR propietario)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            },
            body: {
                type: 'object',
                properties: {
                    fecha: { type: 'string', format: 'date' },
                    horaInicio: { type: 'string' },
                    horaFin: { type: 'string' },
                    modalidad: { type: 'string', enum: ['PRESENCIAL', 'VIRTUAL', 'HIBRIDA'] },
                    motivo: { type: 'string' },
                    resumen: { type: 'string' },
                    compromisos: { type: 'array', items: { type: 'string' } },
                    asistio: { type: 'boolean' }
                }
            }
        }
    }, updateReunion);

    // DELETE /:id (Eliminar reunión)
    fastify.delete('/:id', {
        schema: {
            tags: ['Bitácora de Reuniones'],
            description: 'Eliminar reunión (TUTOR propietario, DIRECTOR, COORDINADOR)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            }
        }
    }, deleteReunion);

}