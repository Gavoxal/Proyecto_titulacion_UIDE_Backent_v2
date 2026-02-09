import {
    createComentario,
    getComentariosByEvidencia,
    deleteComentario,
    getComentariosByPropuesta
} from '../../controllers/comentario.controller.js';
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance, opts: any) {

    fastify.addHook('onRequest', fastify.authenticate);

    const comentarioSchema = {
        type: 'object',
        properties: {
            idComentarios: { type: 'integer' },
            descripcion: { type: 'string' },
            usuario: {
                type: 'object',
                properties: {
                    nombres: { type: 'string' },
                    apellidos: { type: 'string' },
                    rol: { type: 'string' }
                }
            }
        }
    };

    // POST / (Crear Comentario)
    fastify.post('/', {
        schema: {
            tags: ['Comentarios'],
            description: 'Agregar comentario a una evidencia o propuesta (Solo docentes)',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                // required: ['descripcion'], // Either evidenciaId or propuestaId requierd logic is in controller
                required: ['descripcion'],
                properties: {
                    descripcion: { type: 'string' },
                    evidenciaId: { type: 'integer' },
                    propuestaId: { type: 'integer' }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            const allowed = ['ESTUDIANTE', 'TUTOR', 'DIRECTOR', 'DOCENTE_INTEGRACION', 'COMITE', 'PRESIDENTE', 'JURADO_1', 'JURADO_2'];
            // Permitir que estudiantes también participen en el hilo de discusión
            if (!allowed.includes(user.rol)) {
                return reply.code(403).send({ message: 'Solo los roles autorizados pueden comentar' });
            }
        }
    }, createComentario);

    // GET /evidencia/:evidenciaId (Listar por evidencia)
    fastify.get('/evidencia/:evidenciaId', {
        schema: {
            tags: ['Comentarios'],
            description: 'Listar comentarios de una evidencia',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { evidenciaId: { type: 'integer' } }
            },
            response: {
                200: {
                    type: 'array',
                    items: comentarioSchema
                }
            }
        }
    }, getComentariosByEvidencia);

    // GET /propuesta/:propuestaId (Listar por propuesta - NUEVO)
    fastify.get('/propuesta/:propuestaId', {
        schema: {
            tags: ['Comentarios'],
            description: 'Listar comentarios de una propuesta',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { propuestaId: { type: 'integer' } }
            },
            response: {
                200: {
                    type: 'array',
                    items: comentarioSchema
                }
            }
        }
    }, getComentariosByPropuesta);

    // DELETE /:id
    fastify.delete('/:id', {
        schema: {
            tags: ['Comentarios'],
            description: 'Eliminar comentario (Solo autor o admin)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            }
        }
    }, deleteComentario);

}
