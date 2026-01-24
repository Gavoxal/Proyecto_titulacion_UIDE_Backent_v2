import { login } from '../../controllers/auth.controller.js'; // Import with .js for ESM compatibility or let build handle it. Using consistent strategy.
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance, opts: any) {
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
