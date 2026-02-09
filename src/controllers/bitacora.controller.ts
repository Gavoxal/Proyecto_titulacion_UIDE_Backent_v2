import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * BITÁCORA DE REUNIONES
 * Control de acceso:
 * - TUTOR: Puede crear, ver, actualizar y eliminar sus propias reuniones
 * - ESTUDIANTE: Puede ver sus propias reuniones
 * - DIRECTOR/COORDINADOR: Puede ver todas las reuniones
 */

// Helper function to check user role
const checkRole = (user: any, allowedRoles: string[]) => {
    return allowedRoles.includes(user.rol);
};

/**
 * Obtener todas las reuniones (Despachador basado en rol)
 * - TUTOR: Sus reuniones como tutor
 * - ESTUDIANTE: Sus reuniones como estudiante
 * - DIRECTOR/COORDINADOR: Todas las reuniones
 */
export const getAllReuniones = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;

    try {
        if (checkRole(user, ['TUTOR'])) {
            // Delegar a getReunionesByTutor
            // Hack: Modificamos params para simular la petición
            (request.params as any).tutorId = user.id;
            return getReunionesByTutor(request, reply);
        } else if (checkRole(user, ['ESTUDIANTE'])) {
            // Delegar a getReunionesByEstudiante
            (request.params as any).estudianteId = user.id;
            return getReunionesByEstudiante(request, reply);
        } else if (checkRole(user, ['DIRECTOR', 'COORDINADOR'])) {
            // Obtener todas
            const reuniones = await prisma.bitacoraReunion.findMany({
                include: {
                    tutor: {
                        select: { id: true, nombres: true, apellidos: true }
                    },
                    estudiante: {
                        select: { id: true, nombres: true, apellidos: true }
                    },
                    propuesta: {
                        select: { id: true, titulo: true }
                    }
                },
                orderBy: { fecha: 'desc' }
            });
            return reuniones;
        } else {
            return reply.code(403).send({ message: 'No tiene permiso para ver reuniones' });
        }
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo reuniones' });
    }
};

/**
 * Crear nueva reunión
 * Acceso: TUTOR
 */
export const createReunion = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const {
        estudianteId,
        propuestaId,
        fecha,
        horaInicio,
        horaFin,
        modalidad,
        motivo,
        resumen,
        compromisos,
        asistio
    } = request.body as any;

    try {
        // Verificar que el usuario sea TUTOR
        if (!checkRole(user, ['TUTOR'])) {
            return reply.code(403).send({ message: 'Solo los tutores pueden crear reuniones' });
        }

        const nuevaReunion = await prisma.bitacoraReunion.create({
            data: {
                tutorId: user.id,
                estudianteId: Number(estudianteId),
                propuestaId: Number(propuestaId),
                fecha: new Date(fecha),
                horaInicio: new Date(`1970-01-01T${horaInicio}`),
                horaFin: new Date(`1970-01-01T${horaFin}`),
                modalidad,
                motivo,
                resumen,
                compromisos: compromisos || [],
                asistio: asistio !== undefined ? asistio : false
            },
            include: {
                tutor: {
                    select: { id: true, nombres: true, apellidos: true }
                },
                estudiante: {
                    select: { id: true, nombres: true, apellidos: true }
                },
                propuesta: {
                    select: { id: true, titulo: true }
                }
            }
        });

        return reply.code(201).send(nuevaReunion);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error creando reunión' });
    }
};

/**
 * Obtener reunión por ID
 * Acceso: TUTOR (propias), ESTUDIANTE (propias), DIRECTOR, COORDINADOR (todas)
 */
export const getReunionById = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { id } = request.params as any;

    try {
        const reunion = await prisma.bitacoraReunion.findUnique({
            where: { id: Number(id) },
            include: {
                tutor: {
                    select: { id: true, nombres: true, apellidos: true, correoInstitucional: true }
                },
                estudiante: {
                    select: { id: true, nombres: true, apellidos: true, correoInstitucional: true }
                },
                propuesta: {
                    select: { id: true, titulo: true }
                }
            }
        });

        if (!reunion) {
            return reply.code(404).send({ message: 'Reunión no encontrada' });
        }

        // Verificar permisos
        const isAdmin = checkRole(user, ['DIRECTOR', 'COORDINADOR']);
        const isOwner = reunion.tutorId === user.id || reunion.estudianteId === user.id;

        if (!isAdmin && !isOwner) {
            return reply.code(403).send({ message: 'No tiene permiso para ver esta reunión' });
        }

        return reunion;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo reunión' });
    }
};

/**
 * Obtener reuniones por tutor
 * Acceso: TUTOR (propias), DIRECTOR, COORDINADOR (todas)
 */
export const getReunionesByTutor = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { tutorId } = request.params as any;

    try {
        // Verificar permisos
        const isAdmin = checkRole(user, ['DIRECTOR', 'COORDINADOR']);
        const isOwnTutor = user.id === Number(tutorId);

        if (!isAdmin && !isOwnTutor) {
            return reply.code(403).send({ message: 'No tiene permiso para ver estas reuniones' });
        }

        const reuniones = await prisma.bitacoraReunion.findMany({
            where: { tutorId: Number(tutorId) },
            include: {
                estudiante: {
                    select: { id: true, nombres: true, apellidos: true }
                },
                propuesta: {
                    select: { id: true, titulo: true }
                }
            },
            orderBy: { fecha: 'desc' }
        });

        return reuniones;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo reuniones' });
    }
};

/**
 * Obtener reuniones por estudiante
 * Acceso: ESTUDIANTE (propias), TUTOR (de sus estudiantes), DIRECTOR, COORDINADOR (todas)
 */
export const getReunionesByEstudiante = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { estudianteId } = request.params as any;

    try {
        // Verificar permisos
        const isAdmin = checkRole(user, ['DIRECTOR', 'COORDINADOR']);
        const isOwnStudent = user.id === Number(estudianteId);

        // Si es tutor, verificar que sea tutor del estudiante
        let isTutorOfStudent = false;
        if (checkRole(user, ['TUTOR'])) {
            const trabajos = await prisma.trabajoTitulacion.findMany({
                where: {
                    fkTutorId: user.id,
                    propuesta: { fkEstudiante: Number(estudianteId) }
                }
            });
            isTutorOfStudent = trabajos.length > 0;
        }

        if (!isAdmin && !isOwnStudent && !isTutorOfStudent) {
            return reply.code(403).send({ message: 'No tiene permiso para ver estas reuniones' });
        }

        const reuniones = await prisma.bitacoraReunion.findMany({
            where: { estudianteId: Number(estudianteId) },
            include: {
                tutor: {
                    select: { id: true, nombres: true, apellidos: true }
                },
                propuesta: {
                    select: { id: true, titulo: true }
                }
            },
            orderBy: { fecha: 'desc' }
        });

        return reuniones;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo reuniones' });
    }
};

/**
 * Obtener reuniones por propuesta
 * Acceso: TUTOR (de la propuesta), ESTUDIANTE (de la propuesta), DIRECTOR, COORDINADOR
 */
export const getReunionesByPropuesta = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { propuestaId } = request.params as any;

    try {
        // Obtener la propuesta para verificar permisos
        const propuesta = await prisma.propuesta.findUnique({
            where: { id: Number(propuestaId) },
            include: {
                trabajosTitulacion: true
            }
        });

        if (!propuesta) {
            return reply.code(404).send({ message: 'Propuesta no encontrada' });
        }

        // Verificar permisos
        const isAdmin = checkRole(user, ['DIRECTOR', 'COORDINADOR']);
        const isStudent = propuesta.fkEstudiante === user.id;
        const isTutor = propuesta.trabajosTitulacion.some(t => t.fkTutorId === user.id);

        if (!isAdmin && !isStudent && !isTutor) {
            return reply.code(403).send({ message: 'No tiene permiso para ver estas reuniones' });
        }

        const reuniones = await prisma.bitacoraReunion.findMany({
            where: { propuestaId: Number(propuestaId) },
            include: {
                tutor: {
                    select: { id: true, nombres: true, apellidos: true }
                },
                estudiante: {
                    select: { id: true, nombres: true, apellidos: true }
                }
            },
            orderBy: { fecha: 'desc' }
        });

        return reuniones;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo reuniones' });
    }
};

/**
 * Actualizar reunión
 * Acceso: TUTOR (solo sus propias reuniones)
 */
export const updateReunion = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { id } = request.params as any;
    const data = request.body as any;

    try {
        // Verificar que sea tutor
        if (!checkRole(user, ['TUTOR'])) {
            return reply.code(403).send({ message: 'Solo los tutores pueden actualizar reuniones' });
        }

        // Verificar que la reunión existe y pertenece al tutor
        const reunion = await prisma.bitacoraReunion.findUnique({
            where: { id: Number(id) }
        });

        if (!reunion) {
            return reply.code(404).send({ message: 'Reunión no encontrada' });
        }

        if (reunion.tutorId !== user.id) {
            return reply.code(403).send({ message: 'No tiene permiso para actualizar esta reunión' });
        }

        // Preparar datos para actualización
        const updateData: any = {};
        if (data.fecha) updateData.fecha = new Date(data.fecha);
        if (data.horaInicio) updateData.horaInicio = new Date(`1970-01-01T${data.horaInicio}`);
        if (data.horaFin) updateData.horaFin = new Date(`1970-01-01T${data.horaFin}`);
        if (data.modalidad) updateData.modalidad = data.modalidad;
        if (data.motivo) updateData.motivo = data.motivo;
        if (data.resumen) updateData.resumen = data.resumen;
        if (data.compromisos) updateData.compromisos = data.compromisos;
        if (data.asistio !== undefined) updateData.asistio = data.asistio;

        const reunionActualizada = await prisma.bitacoraReunion.update({
            where: { id: Number(id) },
            data: updateData,
            include: {
                tutor: {
                    select: { id: true, nombres: true, apellidos: true }
                },
                estudiante: {
                    select: { id: true, nombres: true, apellidos: true }
                },
                propuesta: {
                    select: { id: true, titulo: true }
                }
            }
        });

        return reunionActualizada;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error actualizando reunión' });
    }
};

/**
 * Eliminar reunión
 * Acceso: TUTOR (solo sus propias reuniones), DIRECTOR, COORDINADOR
 */
export const deleteReunion = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { id } = request.params as any;

    try {
        // Verificar que la reunión existe
        const reunion = await prisma.bitacoraReunion.findUnique({
            where: { id: Number(id) }
        });

        if (!reunion) {
            return reply.code(404).send({ message: 'Reunión no encontrada' });
        }

        // Verificar permisos
        const isAdmin = checkRole(user, ['DIRECTOR', 'COORDINADOR']);
        const isOwner = reunion.tutorId === user.id;

        if (!isAdmin && !isOwner) {
            return reply.code(403).send({ message: 'No tiene permiso para eliminar esta reunión' });
        }

        await prisma.bitacoraReunion.delete({
            where: { id: Number(id) }
        });

        return reply.code(204).send();
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error eliminando reunión' });
    }
};