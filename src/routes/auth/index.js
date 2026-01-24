import { login } from '../../controllers/authController.js';

export default async function (fastify, opts) {
    fastify.post('/login', {
        schema: {
            description: 'Login de usuario',
            tags: ['Auth'],
            body: {
                type: 'object',
                required: ['correo', 'clave'],
                properties: {
                    correo: { type: 'string', format: 'email' },
                    clave: { type: 'string' }
                }
            },
            response: {
                200: {
                    description: 'Login exitoso',
                    type: 'object',
                    properties: {
                        token: { type: 'string' },
                        usuario: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer' },
                                nombre: { type: 'string' },
                                rol: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, login);
}
