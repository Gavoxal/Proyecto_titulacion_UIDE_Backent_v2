import {
    getUsuarios,
    getUsuarioById,
    createUsuario,
    updateUsuario,
    deleteUsuario
} from '../../controllers/usuario.controller.js';
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance, opts: any) {

    // Hook de seguridad global para este prefijo (todas las rutas de usuarios requieren auth)
    fastify.addHook('onRequest', fastify.authenticate);

    // Schema compartido para usuario
    const usuarioSchema = {
        type: 'object',
        properties: {
            id: { type: 'integer' },
            cedula: { type: 'string' },
            nombres: { type: 'string' },
            apellidos: { type: 'string' },
            correoInstitucional: { type: 'string', format: 'email' },
            rol: { type: 'string' }
        }
    };

    // GET / (Listar)
    fastify.get('/', {
        schema: {
            description: 'Obtener lista de usuarios',
            tags: ['Usuarios'],
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'array',
                    items: usuarioSchema
                }
            }
        }
    }, getUsuarios);

    // GET /:id (Obtener uno)
    fastify.get('/:id', {
        schema: {
            description: 'Obtener usuario por ID',
            tags: ['Usuarios'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            },
            response: {
                200: usuarioSchema
            }
        }
    }, getUsuarioById);

    // POST / (Crear)
    fastify.post('/', {
        schema: {
            description: 'Crear nuevo usuario',
            tags: ['Usuarios'],
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                required: ['cedula', 'nombres', 'apellidos', 'correo', 'clave'],
                properties: {
                    cedula: { type: 'string' },
                    nombres: { type: 'string' },
                    apellidos: { type: 'string' },
                    correo: { type: 'string', format: 'email' },
                    clave: { type: 'string' },
                    rol: {
                        type: 'string',
                        enum: ['ESTUDIANTE', 'TUTOR', 'DIRECTOR', 'COORDINADOR', 'COMITE', 'DOCENTE_INTEGRACION']
                    }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user as any;
            const allowedRoles = ['DIRECTOR', 'DOCENTE_INTEGRACION'];
            if (!allowedRoles.includes(user.rol)) {
                return reply.code(403).send({ message: 'No tienes permisos para crear usuarios' });
            }
        }
    }, createUsuario);

    // PUT /:id (Actualizar)
    fastify.put('/:id', {
        schema: {
            description: 'Actualizar usuario',
            tags: ['Usuarios'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            },
            body: {
                type: 'object',
                properties: {
                    nombres: { type: 'string' },
                    apellidos: { type: 'string' },
                    rol: { type: 'string' },
                    clave: { type: 'string' }
                }
            }
        }
    }, updateUsuario);

    // DELETE /:id (Eliminar)
    fastify.delete('/:id', {
        schema: {
            description: 'Eliminar usuario',
            tags: ['Usuarios'],
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            }
        },
        preHandler: async (request, reply) => {
            const user = request.user as any;
            const allowedRoles = ['DIRECTOR', 'COORDINADOR'];
            if (!allowedRoles.includes(user.rol)) {
                return reply.code(403).send({ message: 'No tienes permisos para eliminar usuarios' });
            }
        }
    }, deleteUsuario);
}
