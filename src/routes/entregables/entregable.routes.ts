import {
    createEntregable,
    getEntregablesByPropuesta,
    updateEntregable,
    getUnlockStatus,
    serveEntregableFile
} from '../../controllers/entregable.controller.js';
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance, opts: any) {

    fastify.addHook('onRequest', fastify.authenticate);

    const entregableSchema = {
        type: 'object',
        properties: {
            id: { type: 'integer' },
            tipo: { type: 'string' },
            urlArchivo: { type: 'string' },
            fechaSubida: { type: 'string', format: 'date-time' },
            version: { type: 'integer' },
            isActive: { type: 'boolean' }
        }
    };

    // GET /unlock-status
    fastify.get('/unlock-status', {
        schema: {
            tags: ['Entregables Finales'],
            description: 'Verificar si el estudiante tiene 16 semanas aprobadas para desbloquear esta sección',
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        unlocked: { type: 'boolean' },
                        approvedWeeks: { type: 'integer' },
                        requiredWeeks: { type: 'integer' }
                    }
                }
            }
        }
    }, getUnlockStatus);

    // POST / (Subir Entregable)
    fastify.post('/', {
        schema: {
            tags: ['Entregables Finales'],
            description: 'Subir entregable final (Tesis, Manual, etc.)',
            consumes: ['multipart/form-data'],
            security: [{ bearerAuth: [] }],
            // Removed strict body validation to allow multipart processing in controller
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            if (user.rol !== 'ESTUDIANTE') {
                return reply.code(403).send({ message: 'Solo estudiantes suben entregables finales' });
            }
        }
    }, createEntregable);

    // GET /propuesta/:propuestaId
    fastify.get('/propuesta/:propuestaId', {
        schema: {
            tags: ['Entregables Finales'],
            description: 'Listar entregables de una propuesta',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { propuestaId: { type: 'integer' } }
            },
            querystring: {
                type: 'object',
                properties: {
                    history: { type: 'string', description: 'Set "true" to see history' }
                }
            },
            response: {
                200: {
                    type: 'array',
                    items: entregableSchema
                }
            }
        }
    }, getEntregablesByPropuesta);

    // PUT /:id (Actualizar Doc)
    fastify.put('/:id', {
        schema: {
            tags: ['Entregables Finales'],
            description: 'Actualizar archivo de entregable',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            },
            body: {
                type: 'object',
                required: ['urlArchivo'],
                properties: {
                    urlArchivo: { type: 'string' }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            if (user.rol !== 'ESTUDIANTE') {
                return reply.code(403).send({ message: 'Solo estudiantes actualizan sus entregables' });
            }
        }
    }, updateEntregable);

    // GET /file/:filename (Servir archivos de entregables)
    fastify.get('/file/:filename', {
        schema: {
            tags: ['Entregables Finales'],
            description: 'Descargar archivo de entregable final',
            params: {
                type: 'object',
                properties: { filename: { type: 'string' } }
            }
        }
    }, serveEntregableFile);

}
