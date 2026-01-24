import {
    createPrerequisito,
    getPrerequisitos,
    validatePrerequisito,
    deletePrerequisito
} from '../../controllers/prerequisito.controller.js';
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance, opts: any) {

    fastify.addHook('onRequest', fastify.authenticate);

    const prerequisitoSchema = {
        type: 'object',
        properties: {
            id: { type: 'integer' },
            nombre: { type: 'string' },
            descripcion: { type: 'string' },
            cumplido: { type: 'boolean' },
            estudiante: {
                type: 'object',
                properties: {
                    nombres: { type: 'string' },
                    apellidos: { type: 'string' }
                }
            }
        }
    };

    // POST / (Subir Documento - Estudiante)
    fastify.post('/', {
        schema: {
            tags: ['Prerrequisitos'],
            description: 'Subir prerrequisito (Estudiante)',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['nombre', 'archivoUrl'],
                properties: {
                    nombre: { type: 'string', enum: ['CERTIFICADO_INGLES', 'MALLA_CURRICULAR', 'PRACTICAS_PREPROFESIONALES', 'VINCULACION'] },
                    descripcion: { type: 'string' },
                    archivoUrl: { type: 'string' }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            if (user.rol !== 'ESTUDIANTE') {
                return reply.code(403).send({ message: 'Solo estudiantes suben prerrequisitos' });
            }
        }
    }, createPrerequisito);

    // GET / (Listar)
    fastify.get('/', {
        schema: {
            tags: ['Prerrequisitos'],
            description: 'Listar prerrequisitos',
            security: [{ bearerAuth: [] }],
            querystring: {
                type: 'object',
                properties: { estudianteId: { type: 'integer' } }
            },
            response: {
                200: {
                    type: 'array',
                    items: prerequisitoSchema
                }
            }
        }
    }, getPrerequisitos);

    // PUT /:id/validate (Validar - Director/Coordinador)
    fastify.put('/:id/validate', {
        schema: {
            tags: ['Prerrequisitos'],
            description: 'Validar prerrequisito',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            },
            body: {
                type: 'object',
                required: ['cumplido'],
                properties: {
                    cumplido: { type: 'boolean' }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            if (!['DIRECTOR', 'COORDINADOR'].includes(user.rol)) {
                return reply.code(403).send({ message: 'No tienes permisos para validar' });
            }
        }
    }, validatePrerequisito);

    // DELETE /:id
    fastify.delete('/:id', {
        schema: {
            tags: ['Prerrequisitos'],
            description: 'Eliminar prerrequisito',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            // Estudiante puede borrar si se equivoco? Sí, por ahora.
            // O solo si NO está validado. Simplifiquemos: Estudiante y Admin.
            if (user.rol === 'ESTUDIANTE') {
                // TODO: Verificar que sea SU prerrequisito.
            }
        }
    }, deletePrerequisito);

}
