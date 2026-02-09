import {
    createPropuesta,
    getPropuestas,
    getPropuestaById,
    updatePropuesta,
    deletePropuesta,
    updateEstadoPropuesta,
    uploadPropuestaFile,
    servePropuestaFile,
    revisarPropuesta
} from '../../controllers/propuesta.controller.js';
import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance, opts: any) {

    fastify.addHook('onRequest', fastify.authenticate);

    const propuestaSchema = {
        type: 'object',
        properties: {
            id: { type: 'integer' },
            titulo: { type: 'string' },
            objetivos: { type: 'string' },
            problematica: { type: 'string', nullable: true },
            alcance: { type: 'string', nullable: true },
            archivoUrl: { type: 'string', nullable: true },
            estado: { type: 'string' },
            fechaPublicacion: { type: 'string', format: 'date-time' },
            estudiante: {
                type: 'object',
                properties: {
                    nombres: { type: 'string' },
                    apellidos: { type: 'string' },
                    cedula: { type: 'string' },
                    correoInstitucional: { type: 'string' },
                    estudiantePerfil: {
                        type: 'object',
                        nullable: true,
                        properties: {
                            escuela: { type: 'string' },
                            carrera: { type: 'string' }
                        }
                    }
                }
            },
            areaConocimiento: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    nombre: { type: 'string' },
                    codigo: { type: 'string' }
                }
            },
            trabajosTitulacion: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        tutor: {
                            type: 'object',
                            properties: {
                                nombres: { type: 'string' },
                                apellidos: { type: 'string' },
                                correoInstitucional: { type: 'string' }
                            }
                        }
                    }
                }
            },
            comentarios: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
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

    // POST /upload (Subir archivo primero)
    fastify.post('/upload', {
        schema: {
            tags: ['Propuestas'],
            description: 'Subir archivo de propuesta',
            consumes: ['multipart/form-data'],
            security: [{ bearerAuth: [] }]
        },
        preHandler: async (request: any, reply: any) => {
            const user = request.user;
            if (user.rol !== 'ESTUDIANTE') {
                return reply.code(403).send({ message: 'Solo los estudiantes pueden subir archivos' });
            }
        }
    }, uploadPropuestaFile);

    // GET /file/:filename (Servir archivo)
    fastify.get('/file/:filename', {
        schema: {
            tags: ['Propuestas'],
            description: 'Obtener archivo de propuesta',
            params: {
                type: 'object',
                properties: { filename: { type: 'string' } }
            }
            // No auth required for public access if needed, or add auth if private
        }
    }, servePropuestaFile);

    fastify.post('/', {
        schema: {
            tags: ['Propuestas'],
            description: 'Crear nueva propuesta (Multipart)',
            consumes: ['multipart/form-data'],
            security: [{ bearerAuth: [] }]
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
                    archivoUrl: { type: 'string' },
                    tutorId: { type: 'integer' }
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
            },
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

    // PUT /:id/revision
    fastify.put('/:id/revision', {
        schema: {
            tags: ['Propuestas'],
            description: 'Revisar propuesta (Director/Coordinador)',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: { id: { type: 'integer' } }
            },
            body: {
                type: 'object',
                required: ['estadoRevision'],
                properties: {
                    estadoRevision: { type: 'string', enum: ['APROBADA', 'RECHAZADA', 'APROBADA_CON_COMENTARIOS'] },
                    comentariosRevision: { type: 'string' }
                }
            }
        }
    }, revisarPropuesta);
}
