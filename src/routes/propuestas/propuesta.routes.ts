import {
    createPropuesta,
    getPropuestas,
    getPropuestaById,
    updatePropuesta,
    deletePropuesta,
    updateEstadoPropuesta
} from '../../controllers/propuesta.controller.js';
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance, opts: any) {

    fastify.addHook('onRequest', fastify.authenticate);

    const propuestaSchema = {
        type: 'object',
        properties: {
            id: { type: 'integer' },
            titulo: { type: 'string' },
            estado: { type: 'string' },
            fechaPublicacion: { type: 'string', format: 'date-time' },
            estudiante: {
                type: 'object',
                properties: {
                    nombres: { type: 'string' },
                    apellidos: { type: 'string' }
                }
            }
        }
    };

    // GET / (Listar)
    fastify.get('/', {
        schema: {
            tags: ['Propuestas'],
            description: 'Listar propuestas (filtra por usuario si es estudiante)',
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'array',
                    items: propuestaSchema
                }
            }
        }
    }, getPropuestas);

    // GET /:id (Obtener una)
    fastify.get('/:id', {
        schema: {
            tags: ['Propuestas'],
            description: 'Obtener propuesta por ID',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            },
            response: {
                200: propuestaSchema
            }
        }
    }, getPropuestaById);

    // POST / (Crear)
    fastify.post('/', {
        schema: {
            tags: ['Propuestas'],
            description: 'Crear nueva propuesta',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['titulo', 'objetivos', 'areaInvestigacion'],
                properties: {
                    titulo: { type: 'string' },
                    objetivos: { type: 'string' },
                    problematica: { type: 'string' },
                    alcance: { type: 'string' },
                    archivoUrl: { type: 'string' },
                    areaInvestigacion: {
                        type: 'string',
                        enum: ['INTELIGENCIA_ARTIFICIAL', 'CIBERSEGURIDAD', 'DESARROLLO_SOFTWARE', 'CONTROL_CALIDAD']
                    }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            if (user.rol !== 'ESTUDIANTE') {
                return reply.code(403).send({ message: 'Solo los estudiantes pueden crear propuestas' });
            }
        }
    }, createPropuesta);

    // PUT /:id (Editar info general)
    fastify.put('/:id', {
        schema: {
            tags: ['Propuestas'],
            description: 'Editar datos de la propuesta (No estado)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            },
            body: {
                type: 'object',
                properties: {
                    titulo: { type: 'string' },
                    objetivos: { type: 'string' },
                    problematica: { type: 'string' },
                    alcance: { type: 'string' },
                    archivoUrl: { type: 'string' }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            // Estudiantes pueden editar sus propias propuestas (idealmente si estan pendientes, no validaremos estado por ahora para simplificar)
            // Directores/Tutores quizas tambien
            const user = request.user;
            if (user.rol === 'ESTUDIANTE') {
                // TODO: Validar que sea SU propuesta. Por ahora se permite si es estudiante.
            }
        }
    }, updatePropuesta);

    // DELETE /:id
    fastify.delete('/:id', {
        schema: {
            tags: ['Propuestas'],
            description: 'Eliminar propuesta',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            // Solo Director o Coordinador elimina propuestas
            if (!['DIRECTOR', 'COORDINADOR'].includes(user.rol)) {
                return reply.code(403).send({ message: 'No tienes permisos para eliminar propuestas' });
            }
        }
    }, deletePropuesta);

    // PUT /:id/estado
    fastify.put('/:id/estado', {
        schema: {
            tags: ['Propuestas'],
            description: 'Actualizar estado de propuesta (Aprobación)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            },
            body: {
                type: 'object',
                required: ['estado'],
                properties: {
                    estado: {
                        type: 'string',
                        enum: ['PENDIENTE', 'APROBADA', 'APROBADA_CON_COMENTARIOS', 'RECHAZADA']
                    }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            if (['ESTUDIANTE'].includes(user.rol)) {
                return reply.code(403).send({ message: 'Estudiantes no pueden cambiar el estado' });
            }
        }
    }, updateEstadoPropuesta);
}
