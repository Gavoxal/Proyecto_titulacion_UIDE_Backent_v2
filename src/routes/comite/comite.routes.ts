import {
    asignarJurado,
    getComiteByPropuesta,
    agendarDefensa,
    calificarDefensa
} from '../../controllers/comite.controller.js';
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance, opts: any) {

    fastify.addHook('onRequest', fastify.authenticate);

    const comiteSchema = {
        type: 'object',
        properties: {
            rol: { type: 'string' },
            fechaAsignada: { type: 'string', format: 'date-time' },
            fechaDefensa: { type: 'string', format: 'date-time' },
            calificacion: { type: 'number' },
            resultadoDefensa: { type: 'string' },
            usuario: {
                type: 'object',
                properties: {
                    nombres: { type: 'string' },
                    apellidos: { type: 'string' },
                    correoInstitucional: { type: 'string' }
                }
            }
        }
    };

    // POST / (Asignar Jurado)
    fastify.post('/', {
        schema: {
            tags: ['Comité y Defensa'],
            description: 'Asignar miembro del comité (Solo Director/Coordinador)',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['usuarioId', 'propuestaId', 'rol'],
                properties: {
                    usuarioId: { type: 'integer' },
                    propuestaId: { type: 'integer' },
                    rol: { type: 'string', enum: ['JURADO_1', 'JURADO_2', 'PRESIDENTE'] }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            if (!['DIRECTOR', 'COORDINADOR'].includes(user.rol)) {
                return reply.code(403).send({ message: 'No tienes permiso para asignar jurado' });
            }
        }
    }, asignarJurado);

    // GET /propuesta/:propuestaId
    fastify.get('/propuesta/:propuestaId', {
        schema: {
            tags: ['Comité y Defensa'],
            description: 'Ver comité asignado a una propuesta',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { propuestaId: { type: 'integer' } }
            },
            response: {
                200: {
                    type: 'array',
                    items: comiteSchema
                }
            }
        }
    }, getComiteByPropuesta);

    // PUT /propuesta/:propuestaId/agendar
    fastify.put('/propuesta/:propuestaId/agendar', {
        schema: {
            tags: ['Comité y Defensa'],
            description: 'Agendar fecha de defensa (Director/Coordinador)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { propuestaId: { type: 'integer' } }
            },
            body: {
                type: 'object',
                required: ['fechaDefensa'],
                properties: {
                    fechaDefensa: { type: 'string', format: 'date-time' }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            if (!['DIRECTOR', 'COORDINADOR'].includes(user.rol)) {
                return reply.code(403).send({ message: 'No tienes permisos para agendar defensa' });
            }
        }
    }, agendarDefensa);

    // PUT /propuesta/:propuestaId/calificar
    fastify.put('/propuesta/:propuestaId/calificar', {
        schema: {
            tags: ['Comité y Defensa'],
            description: 'Calificar defensa (Solo Jurado asignado)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { propuestaId: { type: 'integer' } }
            },
            body: {
                type: 'object',
                required: ['calificacion', 'resultado'],
                properties: {
                    calificacion: { type: 'number', minimum: 0, maximum: 10 },
                    resultado: { type: 'string', enum: ['APROBADO', 'REPROBADO'] }
                }
            }
        }
    }, calificarDefensa);

}
