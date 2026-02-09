
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Crear un nuevo trabajo de titulación (asignar tutor a propuesta)
 * POST /api/v1/trabajos-titulacion
 */
export const createTrabajoTitulacion = async (request: FastifyRequest, reply: FastifyReply) => {
    // @ts-ignore
    const prisma = request.server.prisma;
    const { propuestaId, tutorId, observaciones } = request.body as any;

    try {
        // Validar que la propuesta existe y está aprobada
        const propuesta = await prisma.propuesta.findUnique({
            where: { id: Number(propuestaId) }
        });

        if (!propuesta) {
            return reply.code(404).send({ message: 'Propuesta no encontrada' });
        }

        if (propuesta.estado !== 'APROBADA' && propuesta.estado !== 'APROBADA_CON_COMENTARIOS') {
            return reply.code(400).send({
                message: 'Solo se pueden asignar tutores a propuestas aprobadas'
            });
        }

        // Validar que el tutor existe y tiene rol TUTOR
        const tutor = await prisma.usuario.findUnique({
            where: { id: Number(tutorId) }
        });

        if (!tutor || tutor.rol !== 'TUTOR') {
            return reply.code(404).send({ message: 'Tutor no encontrado o rol inválido' });
        }

        // Verificar si ya existe una asignación activa para esta propuesta
        const asignacionExistente = await prisma.trabajoTitulacion.findFirst({
            where: {
                propuestasId: Number(propuestaId),
                estadoAsignacion: 'ACTIVO'
            }
        });

        if (asignacionExistente) {
            return reply.code(400).send({
                message: 'Esta propuesta ya tiene un tutor asignado'
            });
        }

        // Crear el trabajo de titulación
        const trabajoTitulacion = await prisma.trabajoTitulacion.create({
            data: {
                propuestasId: Number(propuestaId),
                fkTutorId: Number(tutorId),
                observaciones: observaciones || null,
                estadoAsignacion: 'ACTIVO'
            },
            include: {
                propuesta: {
                    include: {
                        estudiante: {
                            select: {
                                id: true,
                                nombres: true,
                                apellidos: true,
                                correoInstitucional: true
                            }
                        },
                        areaConocimiento: true
                    }
                },
                tutor: {
                    select: {
                        id: true,
                        nombres: true,
                        apellidos: true,
                        correoInstitucional: true
                    }
                }
            }
        });

        // Crear notificación para el estudiante
        await prisma.notificacion.create({
            data: {
                usuarioId: propuesta.fkEstudiante,
                mensaje: `Se ha asignado al tutor ${tutor.nombres} ${tutor.apellidos} para tu propuesta de titulación: "${propuesta.titulo}".`,
                leido: false
            }
        });

        return reply.code(201).send(trabajoTitulacion);
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            message: 'Error al asignar tutor',
            error: error.message
        });
    }
};

/**
 * Obtener todos los trabajos de titulación
 * GET /api/v1/trabajos-titulacion
 */
export const getTrabajosTitulacion = async (request: FastifyRequest, reply: FastifyReply) => {
    // @ts-ignore
    const prisma = request.server.prisma;
    const { tutorId, estudianteId, estado } = request.query as any;

    try {
        const where: any = {};

        if (tutorId) {
            where.fkTutorId = parseInt(tutorId);
        }

        if (estudianteId) {
            where.propuesta = {
                fkEstudiante: parseInt(estudianteId)
            };
        }

        if (estado) {
            where.estadoAsignacion = estado;
        }

        const trabajos = await prisma.trabajoTitulacion.findMany({
            where,
            include: {
                propuesta: {
                    include: {
                        estudiante: {
                            select: {
                                id: true,
                                nombres: true,
                                apellidos: true,
                                correoInstitucional: true
                            }
                        },
                        areaConocimiento: true
                    }
                },
                tutor: {
                    select: {
                        id: true,
                        nombres: true,
                        apellidos: true,
                        correoInstitucional: true
                    }
                }
            },
            orderBy: {
                fechaAsignacion: 'desc'
            }
        });

        return reply.send(trabajos);
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            message: 'Error al obtener trabajos de titulación',
            error: error.message
        });
    }
};

/**
 * Obtener un trabajo de titulación por ID
 * GET /api/v1/trabajos-titulacion/:propuestaId/:tutorId
 */
export const getTrabajoTitulacionById = async (request: FastifyRequest, reply: FastifyReply) => {
    // @ts-ignore
    const prisma = request.server.prisma;
    const { propuestaId, tutorId } = request.params as any;

    try {
        const trabajo = await prisma.trabajoTitulacion.findUnique({ // Changed from findFirst to findUnique for composite key if possible, but schema says @@id([propuestasId, fkTutorId])
            where: {
                propuestasId_fkTutorId: { // This assumes Prisma generated this compound key name.
                    propuestasId: parseInt(propuestaId),
                    fkTutorId: parseInt(tutorId)
                }
            },
            include: {
                propuesta: {
                    include: {
                        estudiante: {
                            select: {
                                id: true,
                                nombres: true,
                                apellidos: true,
                                correoInstitucional: true
                            }
                        },
                        areaConocimiento: true
                    }
                },
                tutor: {
                    select: {
                        id: true,
                        nombres: true,
                        apellidos: true,
                        correoInstitucional: true
                    }
                }
            }
        });

        if (!trabajo) {
            return reply.code(404).send({ message: 'Trabajo de titulación no encontrado' });
        }

        return reply.send(trabajo);
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            message: 'Error al obtener trabajo de titulación',
            error: error.message
        });
    }
};

/**
 * Actualizar estado de asignación
 * PUT /api/v1/trabajos-titulacion/:propuestaId/:tutorId
 */
export const updateTrabajoTitulacion = async (request: FastifyRequest, reply: FastifyReply) => {
    // @ts-ignore
    const prisma = request.server.prisma;
    const { propuestaId, tutorId } = request.params as any;
    const { estadoAsignacion, observaciones } = request.body as any;

    try {
        // Use update instead of updateMany for unique identification
        const trabajoActualizado = await prisma.trabajoTitulacion.update({
            where: {
                propuestasId_fkTutorId: {
                    propuestasId: parseInt(propuestaId),
                    fkTutorId: parseInt(tutorId)
                }
            },
            data: {
                estadoAsignacion: estadoAsignacion || undefined,
                observaciones: observaciones !== undefined ? observaciones : undefined
            },
            include: {
                propuesta: {
                    include: {
                        estudiante: {
                            select: {
                                id: true,
                                nombres: true,
                                apellidos: true,
                                correoInstitucional: true
                            }
                        },
                        areaConocimiento: true
                    }
                },
                tutor: {
                    select: {
                        id: true,
                        nombres: true,
                        apellidos: true,
                        correoInstitucional: true
                    }
                }
            }
        });

        return reply.send(trabajoActualizado);
    } catch (error: any) {
        request.log.error(error);
        // Handle P2025 (Record not found)
        if (error.code === 'P2025') {
            return reply.code(404).send({ message: 'Trabajo de titulación no encontrado' });
        }
        return reply.code(500).send({
            message: 'Error al actualizar trabajo de titulación',
            error: error.message
        });
    }
};

/**
 * Obtener estadísticas de carga de tutores
 * GET /api/v1/trabajos-titulacion/stats/carga-tutores
 */
export const getCargaTutores = async (request: FastifyRequest, reply: FastifyReply) => {
    // @ts-ignore
    const prisma = request.server.prisma;

    try {
        const tutores = await prisma.usuario.findMany({
            where: {
                rol: 'TUTOR'
            },
            select: {
                id: true,
                nombres: true,
                apellidos: true,
                correoInstitucional: true
            }
        });

        const cargaTutores = await Promise.all(
            tutores.map(async (tutor) => {
                const trabajosActivos = await prisma.trabajoTitulacion.count({
                    where: {
                        fkTutorId: tutor.id,
                        estadoAsignacion: 'ACTIVO'
                    }
                });

                return {
                    ...tutor,
                    trabajosActivos,
                    disponible: trabajosActivos < 5 // Máximo 5 trabajos por tutor
                };
            })
        );

        return reply.send(cargaTutores);
    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            message: 'Error al obtener carga de tutores',
            error: error.message
        });
    }
};
