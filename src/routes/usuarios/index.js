import {
    getUsuarios,
    getUsuarioById,
    createUsuario,
    updateUsuario,
    deleteUsuario
} from '../../controllers/usuarioController.js';

export default async function (fastify, opts) {

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
            security: [{ apiKey: [] }],
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
            security: [{ apiKey: [] }],
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
            security: [{ apiKey: [] }],
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
        }
    }, createUsuario);

    // PUT /:id (Actualizar)
    fastify.put('/:id', {
        schema: {
            description: 'Actualizar usuario',
            tags: ['Usuarios'],
            security: [{ apiKey: [] }],
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
            security: [{ apiKey: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            }
        }
    }, deleteUsuario);
}
