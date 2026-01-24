import {
    createComentario,
    getComentariosByEvidencia,
    deleteComentario
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
            description: 'Agregar comentario a una evidencia (Solo docentes)',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['descripcion', 'evidenciaId'],
                properties: {
                    descripcion: { type: 'string' },
                    evidenciaId: { type: 'integer' }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            const allowed = ['TUTOR', 'DIRECTOR', 'DOCENTE_INTEGRACION', 'COMITE', 'PRESIDENTE', 'JURADO_1', 'JURADO_2'];
            // Estudiantes NO comentan segun la logica usual (reciben feedback), aunque a veces pueden responder.
            // Asumire por ahora que es feedback de docentes.
            if (!allowed.includes(user.rol)) {
                return reply.code(403).send({ message: 'Solo los docentes pueden iniciar comentarios' });
            }
        }
    }, createComentario);

    // GET /evidencia/:evidenciaId (Listar)
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
