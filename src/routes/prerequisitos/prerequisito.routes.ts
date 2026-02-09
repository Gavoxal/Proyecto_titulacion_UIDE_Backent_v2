import {
    createEstudiantePrerequisito,
    getEstudiantePrerequisitos,
    validatePrerequisito,
    deleteEstudiantePrerequisito,
    getPrerequisitosDashboard,
    uploadPrerequisitoFile,
    servePrerequisitoFile,
    checkCanCreatePropuesta,
    enableStudentAccess
} from '../../controllers/prerequisito.controller.js';
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance, opts: any) {

    fastify.addHook('onRequest', fastify.authenticate);

    // GET /status (Verificar estado)
    fastify.get('/status', {
        schema: {
            tags: ['Prerrequisitos'],
            description: 'Verificar si el estudiante puede crear propuesta',
            security: [{ bearerAuth: [] }]
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            const userRole = user.rol ? user.rol.toUpperCase() : '';
            if (userRole !== 'ESTUDIANTE') {
                return reply.code(403).send({ message: 'Solo estudiantes verifican su estado' });
            }
        }
    }, checkCanCreatePropuesta);

    const prerequisitoSchema = {
        type: 'object',
        properties: {
            id: { type: 'integer' },
            nombre: { type: 'string' },
            codigo: { type: 'string' },
            descripcion: { type: 'string' },
            orden: { type: 'integer' },
            estudiantePrerequisitoId: { type: ['integer', 'null'] },
            entregado: { type: 'boolean' },
            cumplido: { type: 'boolean' },
            archivoUrl: { type: ['string', 'null'] },
            fechaCumplimiento: { type: ['string', 'null'] },
            fechaActualizacion: { type: ['string', 'null'] },
            observaciones: { type: 'string' }
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
                required: ['prerequisitoId'],
                properties: {
                    prerequisitoId: { type: 'integer' },
                    archivoUrl: { type: ['string', 'null'] }
                }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            const userRole = user.rol ? user.rol.toUpperCase() : '';
            if (userRole !== 'ESTUDIANTE') {
                return reply.code(403).send({ message: 'Solo estudiantes suben prerrequisitos' });
            }
        }
    }, createEstudiantePrerequisito);

    // GET /dashboard (Dashboard de Cumplimiento)
    fastify.get('/dashboard', {
        schema: {
            tags: ['Prerrequisitos'],
            description: 'Obtener dashboard de cumplimiento de estudiantes',
            security: [{ bearerAuth: [] }]
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            console.log(`[DEBUG] Dashboard preHandler. UserID: ${user?.id}, Rol: ${user?.rol}`);
            const userRole = user.rol ? user.rol.toUpperCase() : '';
            console.log(`[DEBUG] Checked Role: '${userRole}'`);
            if (!['DIRECTOR', 'COORDINADOR'].includes(userRole)) {
                console.log(`[DEBUG] Access DENIED for ${userRole}`);
                return reply.code(403).send({ message: 'Acceso denegado' });
            }
        }
    }, getPrerequisitosDashboard);

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
    }, getEstudiantePrerequisitos);

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
            const userRole = user.rol ? user.rol.toUpperCase() : '';
            if (!['DIRECTOR', 'COORDINADOR'].includes(userRole)) {
                return reply.code(403).send({ message: 'No tienes permisos para validar' });
            }
        }
    }, validatePrerequisito);

    // POST /:studentId/enable-access (Habilitar acceso - Director)
    fastify.post('/:studentId/enable-access', {
        schema: {
            tags: ['Prerrequisitos'],
            description: 'Habilitar acceso a plataforma (Email + Notificación)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { studentId: { type: 'integer' } }
            }
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            const userRole = user.rol ? user.rol.toUpperCase() : '';
            if (userRole !== 'DIRECTOR') {
                return reply.code(403).send({ message: 'Solo el director puede habilitar acceso' });
            }
        }
    }, enableStudentAccess);

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
    }, deleteEstudiantePrerequisito);

    // POST /upload (Subir documento físico)
    fastify.post('/upload', {
        schema: {
            tags: ['Prerrequisitos'],
            description: 'Subir archivo de prerrequisito (PDF/Imagen)',
            security: [{ bearerAuth: [] }],
            consumes: ['multipart/form-data'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        url: { type: 'string' },
                        filename: { type: 'string' }
                    }
                }
            }
        }
    }, uploadPrerequisitoFile);

    // GET /file/:filename (Servir archivo)
    fastify.get('/file/:filename', {
        schema: {
            tags: ['Prerrequisitos'],
            description: 'Obtener archivo de prerrequisito',
            params: {
                type: 'object',
                properties: { filename: { type: 'string' } }
            }
        }
    }, servePrerequisitoFile);

}