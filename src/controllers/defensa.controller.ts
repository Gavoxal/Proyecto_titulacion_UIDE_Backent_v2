import { FastifyReply, FastifyRequest } from 'fastify';
import { sendDefenseNotificationEmail } from '../services/email.service';

/**
 * DEFENSAS (PRIVADA Y PÚBLICA)
 * Control de acceso:
 * - DIRECTOR/COORDINADOR: Puede programar defensas, asignar participantes
 * - TUTOR/COMITE: Puede ver defensas donde participa y calificar
 * - ESTUDIANTE: Puede ver sus propias defensas
 */

// Helper function to check user role
const checkRole = (user: any, allowedRoles: string[]) => {
    return allowedRoles.includes(user.rol);
};

// ============================================
// DEFENSA PRIVADA
// ============================================

/**
 * Crear/Programar defensa privada
 * Acceso: DIRECTOR, COORDINADOR
 */
export const createDefensaPrivada = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { propuestaId, fechaDefensa, horaDefensa, aula } = request.body as any;

    try {
        // Verificar permisos
        if (!checkRole(user, ['DIRECTOR', 'COORDINADOR'])) {
            return reply.code(403).send({ message: 'Solo directores y coordinadores pueden programar defensas' });
        }

        // Verificar que la propuesta existe
        const propuesta = await prisma.propuesta.findUnique({
            where: { id: Number(propuestaId) }
        });

        if (!propuesta) {
            return reply.code(404).send({ message: 'Propuesta no encontrada' });
        }

        // Verificar si ya existe una defensa privada para esta propuesta
        const defensaExistente = await prisma.evaluacionDefensaPrivada.findUnique({
            where: { propuestaId: Number(propuestaId) }
        });

        if (defensaExistente) {
            return reply.code(400).send({ message: 'Ya existe una defensa privada para esta propuesta' });
        }

        const defensa = await prisma.evaluacionDefensaPrivada.create({
            data: {
                propuestaId: Number(propuestaId),
                fechaDefensa: fechaDefensa ? new Date(fechaDefensa) : null,
                horaDefensa: horaDefensa ? new Date(`1970-01-01T${horaDefensa}`) : null,
                aula,
                estado: fechaDefensa ? 'PROGRAMADA' : 'PENDIENTE'
            },
            include: {
                propuesta: {
                    select: {
                        id: true,
                        titulo: true,
                        estudiante: {
                            select: { id: true, nombres: true, apellidos: true, correoInstitucional: true }
                        }
                    }
                }
            }
        });

        // Notificar al estudiante (sin esperar a que bloquee la respuesta)
        if (fechaDefensa && (defensa.propuesta.estudiante as any).correoInstitucional) {
            sendDefenseNotificationEmail({
                to: (defensa.propuesta.estudiante as any).correoInstitucional,
                nombre: `${defensa.propuesta.estudiante.nombres} ${defensa.propuesta.estudiante.apellidos}`,
                rol: 'ESTUDIANTE',
                tema: defensa.propuesta.titulo,
                fecha: new Date(fechaDefensa).toISOString().split('T')[0],
                hora: horaDefensa,
                aula: aula || 'Por asignar',
                tipo: 'Privada'
            }).catch((err: any) => request.log.error(`Error enviando correo a estudiante: ${err.message}`));
        }

        return reply.code(201).send(defensa);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error creando defensa privada' });
    }
};

/**
 * Obtener defensa privada por propuesta
 * Acceso: Todos los roles (con restricciones)
 */
export const getDefensaPrivadaByPropuesta = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { propuestaId } = request.params as any;

    try {
        const defensa = await prisma.evaluacionDefensaPrivada.findUnique({
            where: { propuestaId: Number(propuestaId) },
            include: {
                propuesta: {
                    select: {
                        id: true,
                        titulo: true,
                        estudiante: {
                            select: { id: true, nombres: true, apellidos: true }
                        }
                    }
                },
                participantes: {
                    include: {
                        usuario: {
                            select: { id: true, nombres: true, apellidos: true, rol: true }
                        }
                    }
                }
            }
        });

        if (!defensa) {
            return reply.code(404).send({ message: 'Defensa privada no encontrada' });
        }

        // Verificar permisos
        const isAdmin = checkRole(user, ['DIRECTOR', 'COORDINADOR']);
        const isStudent = defensa.propuesta.estudiante.id === user.id;
        const isParticipant = defensa.participantes.some(p => p.usuarioId === user.id);

        if (!isAdmin && !isStudent && !isParticipant) {
            return reply.code(403).send({ message: 'No tiene permiso para ver esta defensa' });
        }

        return defensa;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo defensa privada' });
    }
};

/**
 * Actualizar defensa privada
 * Acceso: DIRECTOR, COORDINADOR
 */
export const updateDefensaPrivada = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { id } = request.params as any;
    const data = request.body as any;

    try {
        // Verificar permisos
        if (!checkRole(user, ['DIRECTOR', 'COORDINADOR'])) {
            return reply.code(403).send({ message: 'Solo directores y coordinadores pueden actualizar defensas' });
        }

        const updateData: any = {};
        if (data.fechaDefensa) {
            updateData.fechaDefensa = new Date(data.fechaDefensa);
            if (!data.estado) updateData.estado = 'PROGRAMADA';
        }
        if (data.horaDefensa) updateData.horaDefensa = new Date(`1970-01-01T${data.horaDefensa}`);
        if (data.aula) updateData.aula = data.aula;
        if (data.estado) updateData.estado = data.estado;
        if (data.comentarios) updateData.comentarios = data.comentarios;

        const defensa = await prisma.evaluacionDefensaPrivada.update({
            where: { id: Number(id) },
            data: updateData,
            include: {
                propuesta: {
                    select: { id: true, titulo: true, estudiante: { select: { nombres: true, apellidos: true, correoInstitucional: true } } }
                },
                participantes: {
                    include: {
                        usuario: {
                            select: { id: true, nombres: true, apellidos: true, correoInstitucional: true }
                        }
                    }
                }
            }
        });

        // Notificar cambios (estudiante y participantes)
        if (data.fechaDefensa || data.horaDefensa || data.aula) {
            if ((defensa.propuesta.estudiante as any).correoInstitucional) {
                sendDefenseNotificationEmail({
                    to: (defensa.propuesta.estudiante as any).correoInstitucional,
                    nombre: `${defensa.propuesta.estudiante.nombres} ${defensa.propuesta.estudiante.apellidos}`,
                    rol: 'ESTUDIANTE',
                    tema: defensa.propuesta.titulo,
                    fecha: defensa.fechaDefensa?.toISOString().split('T')[0] || '--',
                    hora: defensa.horaDefensa?.toLocaleTimeString() || '--',
                    aula: defensa.aula || 'Por asignar',
                    tipo: 'Privada'
                }).catch((err: any) => request.log.error(`Error enviando correo a estudiante: ${err.message}`));
            }

            for (const p of defensa.participantes) {
                if ((p.usuario as any).correoInstitucional) {
                    sendDefenseNotificationEmail({
                        to: (p.usuario as any).correoInstitucional,
                        nombre: `${p.usuario.nombres} ${p.usuario.apellidos}`,
                        rol: (p as any).rol || 'Miembro del Tribunal',
                        estudianteNombre: `${defensa.propuesta.estudiante.nombres} ${defensa.propuesta.estudiante.apellidos}`,
                        tema: defensa.propuesta.titulo,
                        fecha: defensa.fechaDefensa?.toISOString().split('T')[0] || '--',
                        hora: defensa.horaDefensa?.toLocaleTimeString() || '--',
                        aula: defensa.aula || 'Por asignar',
                        tipo: 'Privada'
                    }).catch((err: any) => request.log.error(`Error enviando correo a participante: ${err.message}`));
                }
            }
        }

        return defensa;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error actualizando defensa privada' });
    }
};

/**
 * Agregar participante a defensa privada
 * Acceso: DIRECTOR, COORDINADOR
 */
export const addParticipanteDefensaPrivada = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { evaluacionId } = request.params as any;
    const { usuarioId, tipoParticipante, rol } = request.body as any;

    try {
        // Verificar permisos
        if (!checkRole(user, ['DIRECTOR', 'COORDINADOR'])) {
            return reply.code(403).send({ message: 'Solo directores y coordinadores pueden asignar participantes' });
        }

        // Verificar que el usuario existe y tiene el rol apropiado
        const usuario = await prisma.usuario.findUnique({
            where: { id: Number(usuarioId) }
        });

        if (!usuario) {
            return reply.code(404).send({ message: 'Usuario no encontrado' });
        }

        if (tipoParticipante === 'TUTOR' && usuario.rol !== 'TUTOR') {
            return reply.code(400).send({ message: 'El usuario debe tener rol TUTOR' });
        }

        if (tipoParticipante === 'COMITE' && usuario.rol !== 'COMITE') {
            return reply.code(400).send({ message: 'El usuario debe tener rol COMITE' });
        }

        // Verificar si ya existe el participante
        const existente = await prisma.participanteDefensaPrivada.findUnique({
            where: {
                evaluacionId_usuarioId: {
                    evaluacionId: Number(evaluacionId),
                    usuarioId: Number(usuarioId)
                }
            }
        });

        if (existente) {
            return reply.code(400).send({ message: 'El participante ya está asignado a esta defensa' });
        }

        const participante = await prisma.participanteDefensaPrivada.create({
            data: {
                evaluacionId: Number(evaluacionId),
                usuarioId: Number(usuarioId),
                tipoParticipante,
                rol
            },
            include: {
                usuario: {
                    select: { id: true, nombres: true, apellidos: true, rol: true, correoInstitucional: true }
                }
            }
        });

        // Notificar al participante (sin esperar a que bloquee la respuesta)
        const evaluacion = await prisma.evaluacionDefensaPrivada.findUnique({
            where: { id: Number(evaluacionId) },
            include: {
                propuesta: {
                    include: {
                        estudiante: true
                    }
                }
            }
        });

        if (evaluacion && evaluacion.fechaDefensa && (participante.usuario as any).correoInstitucional) {
            sendDefenseNotificationEmail({
                to: (participante.usuario as any).correoInstitucional,
                nombre: `${participante.usuario.nombres} ${participante.usuario.apellidos}`,
                rol: rol || 'Miembro del Tribunal',
                estudianteNombre: `${evaluacion.propuesta.estudiante.nombres} ${evaluacion.propuesta.estudiante.apellidos}`,
                tema: evaluacion.propuesta.titulo,
                fecha: evaluacion.fechaDefensa.toISOString().split('T')[0],
                hora: evaluacion.horaDefensa?.toLocaleTimeString() || '--:--',
                aula: evaluacion.aula || 'Por asignar',
                tipo: 'Privada'
            }).catch((err: any) => request.log.error(`Error enviando correo a participante: ${err.message}`));
        }

        return reply.code(201).send(participante);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error agregando participante' });
    }
};

/**
 * Calificar defensa privada (por participante)
 * Acceso: TUTOR, COMITE (solo si son participantes)
 */
export const calificarDefensaPrivada = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { evaluacionId } = request.params as any;
    const { calificacion, comentario } = request.body as any;

    try {
        // Verificar que el usuario es participante
        const participante = await prisma.participanteDefensaPrivada.findUnique({
            where: {
                evaluacionId_usuarioId: {
                    evaluacionId: Number(evaluacionId),
                    usuarioId: user.id
                }
            }
        });

        if (!participante) {
            return reply.code(403).send({ message: 'No es participante de esta defensa' });
        }

        // Actualizar calificación del participante
        const participanteActualizado = await prisma.participanteDefensaPrivada.update({
            where: {
                evaluacionId_usuarioId: {
                    evaluacionId: Number(evaluacionId),
                    usuarioId: user.id
                }
            },
            data: {
                calificacion: calificacion ? Number(calificacion) : null,
                comentario
            }
        });

        // Calcular promedio de calificaciones si todos han calificado
        const todosParticipantes = await prisma.participanteDefensaPrivada.findMany({
            where: { evaluacionId: Number(evaluacionId) }
        });

        const calificaciones = todosParticipantes
            .map(p => Number(p.calificacion))
            .filter(c => c !== null && !isNaN(c)) as number[];

        if (calificaciones.length === todosParticipantes.length && calificaciones.length > 0) {
            const promedio = calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length;

            await prisma.evaluacionDefensaPrivada.update({
                where: { id: Number(evaluacionId) },
                data: {
                    calificacion: promedio,
                    fechaEvaluacion: new Date()
                }
            });
        }

        return participanteActualizado;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error calificando defensa' });
    }
};

/**
 * Aprobar/Rechazar defensa privada
 * Acceso: DIRECTOR, COORDINADOR
 */
export const finalizarDefensaPrivada = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { id } = request.params as any;
    const { estado, comentarios } = request.body as any; // APROBADA o RECHAZADA

    try {
        // Verificar permisos
        if (!checkRole(user, ['DIRECTOR', 'COORDINADOR'])) {
            return reply.code(403).send({ message: 'Solo directores y coordinadores pueden finalizar defensas' });
        }

        if (!['APROBADA', 'RECHAZADA'].includes(estado)) {
            return reply.code(400).send({ message: 'Estado debe ser APROBADA o RECHAZADA' });
        }

        const defensa = await prisma.evaluacionDefensaPrivada.update({
            where: { id: Number(id) },
            data: {
                estado,
                comentarios,
                fechaEvaluacion: new Date()
            },
            include: {
                propuesta: true
            }
        });

        // Si se aprueba, desbloquear la defensa pública
        if (estado === 'APROBADA') {
            const defensaPublica = await prisma.evaluacionDefensaPublica.findUnique({
                where: { propuestaId: defensa.propuestaId }
            });

            if (defensaPublica && defensaPublica.estado === 'BLOQUEADA') {
                await prisma.evaluacionDefensaPublica.update({
                    where: { id: defensaPublica.id },
                    data: { estado: 'PENDIENTE' }
                });
            }
        }

        return defensa;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error finalizando defensa privada' });
    }
};

// ============================================
// DEFENSA PÚBLICA
// ============================================

/**
 * Crear/Programar defensa pública
 * Acceso: DIRECTOR, COORDINADOR
 */
export const createDefensaPublica = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { propuestaId, fechaDefensa, horaDefensa, aula } = request.body as any;

    try {
        // Verificar permisos
        if (!checkRole(user, ['DIRECTOR', 'COORDINADOR'])) {
            return reply.code(403).send({ message: 'Solo directores y coordinadores pueden programar defensas' });
        }

        // Verificar que existe defensa privada aprobada
        const defensaPrivada = await prisma.evaluacionDefensaPrivada.findUnique({
            where: { propuestaId: Number(propuestaId) }
        });

        if (!defensaPrivada || defensaPrivada.estado !== 'APROBADA') {
            return reply.code(400).send({ message: 'La defensa privada debe estar aprobada primero' });
        }

        // Verificar si ya existe
        const defensaExistente = await prisma.evaluacionDefensaPublica.findUnique({
            where: { propuestaId: Number(propuestaId) }
        });

        if (defensaExistente) {
            return reply.code(400).send({ message: 'Ya existe una defensa pública para esta propuesta' });
        }

        const defensa = await prisma.evaluacionDefensaPublica.create({
            data: {
                propuestaId: Number(propuestaId),
                fechaDefensa: fechaDefensa ? new Date(fechaDefensa) : null,
                horaDefensa: horaDefensa ? new Date(`1970-01-01T${horaDefensa}`) : null,
                aula,
                estado: fechaDefensa ? 'PROGRAMADA' : 'PENDIENTE'
            },
            include: {
                propuesta: {
                    select: {
                        id: true,
                        titulo: true,
                        estudiante: {
                            select: { id: true, nombres: true, apellidos: true, correoInstitucional: true }
                        }
                    }
                }
            }
        });

        // Notificar al estudiante (sin esperar a que bloquee la respuesta)
        if (fechaDefensa && (defensa.propuesta.estudiante as any).correoInstitucional) {
            sendDefenseNotificationEmail({
                to: (defensa.propuesta.estudiante as any).correoInstitucional,
                nombre: `${defensa.propuesta.estudiante.nombres} ${defensa.propuesta.estudiante.apellidos}`,
                rol: 'ESTUDIANTE',
                tema: defensa.propuesta.titulo,
                fecha: new Date(fechaDefensa).toISOString().split('T')[0],
                hora: horaDefensa,
                aula: aula || 'Por asignar',
                tipo: 'Pública'
            }).catch((err: any) => request.log.error(`Error enviando correo a estudiante: ${err.message}`));
        }

        return reply.code(201).send(defensa);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error creando defensa pública' });
    }
};

/**
 * Obtener defensa pública por propuesta
 * Acceso: Todos los roles (con restricciones)
 */
export const getDefensaPublicaByPropuesta = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { propuestaId } = request.params as any;

    try {
        const defensa = await prisma.evaluacionDefensaPublica.findUnique({
            where: { propuestaId: Number(propuestaId) },
            include: {
                propuesta: {
                    select: {
                        id: true,
                        titulo: true,
                        estudiante: {
                            select: { id: true, nombres: true, apellidos: true }
                        }
                    }
                },
                participantes: {
                    include: {
                        usuario: {
                            select: { id: true, nombres: true, apellidos: true, rol: true }
                        }
                    }
                }
            }
        });

        if (!defensa) {
            return reply.code(404).send({ message: 'Defensa pública no encontrada' });
        }

        // Verificar permisos
        const isAdmin = checkRole(user, ['DIRECTOR', 'COORDINADOR']);
        const isStudent = defensa.propuesta.estudiante.id === user.id;
        const isParticipant = defensa.participantes.some(p => p.usuarioId === user.id);

        if (!isAdmin && !isStudent && !isParticipant) {
            return reply.code(403).send({ message: 'No tiene permiso para ver esta defensa' });
        }

        return defensa;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo defensa pública' });
    }
};

/**
 * Actualizar defensa pública
 * Acceso: DIRECTOR, COORDINADOR
 */
export const updateDefensaPublica = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { id } = request.params as any;
    const data = request.body as any;

    try {
        // Verificar permisos
        if (!checkRole(user, ['DIRECTOR', 'COORDINADOR'])) {
            return reply.code(403).send({ message: 'Solo directores y coordinadores pueden actualizar defensas' });
        }

        const updateData: any = {};
        if (data.fechaDefensa) {
            updateData.fechaDefensa = new Date(data.fechaDefensa);
            if (!data.estado) updateData.estado = 'PROGRAMADA';
        }
        if (data.horaDefensa) updateData.horaDefensa = new Date(`1970-01-01T${data.horaDefensa}`);
        if (data.aula) updateData.aula = data.aula;
        if (data.estado) updateData.estado = data.estado;
        if (data.comentarios) updateData.comentarios = data.comentarios;

        const defensa = await prisma.evaluacionDefensaPublica.update({
            where: { id: Number(id) },
            data: updateData,
            include: {
                propuesta: {
                    select: { id: true, titulo: true, estudiante: { select: { nombres: true, apellidos: true, correoInstitucional: true } } }
                },
                participantes: {
                    include: {
                        usuario: {
                            select: { id: true, nombres: true, apellidos: true, correoInstitucional: true }
                        }
                    }
                }
            }
        });

        // Notificar cambios (estudiante y participantes)
        if (data.fechaDefensa || data.horaDefensa || data.aula) {
            if ((defensa.propuesta.estudiante as any).correoInstitucional) {
                sendDefenseNotificationEmail({
                    to: (defensa.propuesta.estudiante as any).correoInstitucional,
                    nombre: `${defensa.propuesta.estudiante.nombres} ${defensa.propuesta.estudiante.apellidos}`,
                    rol: 'ESTUDIANTE',
                    tema: defensa.propuesta.titulo,
                    fecha: defensa.fechaDefensa?.toISOString().split('T')[0] || '--',
                    hora: defensa.horaDefensa?.toLocaleTimeString() || '--',
                    aula: defensa.aula || 'Por asignar',
                    tipo: 'Pública'
                }).catch((err: any) => request.log.error(`Error enviando correo a estudiante: ${err.message}`));
            }

            for (const p of defensa.participantes) {
                if ((p.usuario as any).correoInstitucional) {
                    sendDefenseNotificationEmail({
                        to: (p.usuario as any).correoInstitucional,
                        nombre: `${p.usuario.nombres} ${p.usuario.apellidos}`,
                        rol: (p as any).rol || 'Miembro del Tribunal',
                        estudianteNombre: `${defensa.propuesta.estudiante.nombres} ${defensa.propuesta.estudiante.apellidos}`,
                        tema: defensa.propuesta.titulo,
                        fecha: defensa.fechaDefensa?.toISOString().split('T')[0] || '--',
                        hora: defensa.horaDefensa?.toLocaleTimeString() || '--',
                        aula: defensa.aula || 'Por asignar',
                        tipo: 'Pública'
                    }).catch((err: any) => request.log.error(`Error enviando correo a participante: ${err.message}`));
                }
            }
        }

        return defensa;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error actualizando defensa pública' });
    }
};

/**
 * Agregar participante a defensa pública
 * Acceso: DIRECTOR, COORDINADOR
 */
export const addParticipanteDefensaPublica = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { evaluacionId } = request.params as any;
    const { usuarioId, tipoParticipante, rol } = request.body as any;

    try {
        // Verificar permisos
        if (!checkRole(user, ['DIRECTOR', 'COORDINADOR'])) {
            return reply.code(403).send({ message: 'Solo directores y coordinadores pueden asignar participantes' });
        }

        // Verificar que el usuario existe y tiene el rol apropiado
        const usuario = await prisma.usuario.findUnique({
            where: { id: Number(usuarioId) }
        });

        if (!usuario) {
            return reply.code(404).send({ message: 'Usuario no encontrado' });
        }

        if (tipoParticipante === 'TUTOR' && usuario.rol !== 'TUTOR') {
            return reply.code(400).send({ message: 'El usuario debe tener rol TUTOR' });
        }

        if (tipoParticipante === 'COMITE' && usuario.rol !== 'COMITE') {
            return reply.code(400).send({ message: 'El usuario debe tener rol COMITE' });
        }

        // Verificar si ya existe
        const existente = await prisma.participanteDefensaPublica.findUnique({
            where: {
                evaluacionId_usuarioId: {
                    evaluacionId: Number(evaluacionId),
                    usuarioId: Number(usuarioId)
                }
            }
        });

        if (existente) {
            return reply.code(400).send({ message: 'El participante ya está asignado a esta defensa' });
        }

        const participante = await prisma.participanteDefensaPublica.create({
            data: {
                evaluacionId: Number(evaluacionId),
                usuarioId: Number(usuarioId),
                tipoParticipante,
                rol
            },
            include: {
                usuario: {
                    select: { id: true, nombres: true, apellidos: true, rol: true, correoInstitucional: true }
                }
            }
        });

        // Notificar al participante (sin esperar a que bloquee la respuesta)
        const evaluacion = await prisma.evaluacionDefensaPublica.findUnique({
            where: { id: Number(evaluacionId) },
            include: {
                propuesta: {
                    include: {
                        estudiante: true
                    }
                }
            }
        });

        if (evaluacion && evaluacion.fechaDefensa && (participante.usuario as any).correoInstitucional) {
            sendDefenseNotificationEmail({
                to: (participante.usuario as any).correoInstitucional,
                nombre: `${participante.usuario.nombres} ${participante.usuario.apellidos}`,
                rol: rol || 'Miembro del Tribunal',
                estudianteNombre: `${evaluacion.propuesta.estudiante.nombres} ${evaluacion.propuesta.estudiante.apellidos}`,
                tema: evaluacion.propuesta.titulo,
                fecha: evaluacion.fechaDefensa.toISOString().split('T')[0],
                hora: evaluacion.horaDefensa?.toLocaleTimeString() || '--:--',
                aula: evaluacion.aula || 'Por asignar',
                tipo: 'Pública'
            }).catch((err: any) => request.log.error(`Error enviando correo a participante: ${err.message}`));
        }

        return reply.code(201).send(participante);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error agregando participante' });
    }
};

/**
 * Calificar defensa pública (por participante)
 * Acceso: TUTOR, COMITE (solo si son participantes)
 */
export const calificarDefensaPublica = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { evaluacionId } = request.params as any;
    const { calificacion, comentario } = request.body as any;

    try {
        // Verificar que el usuario es participante
        const participante = await prisma.participanteDefensaPublica.findUnique({
            where: {
                evaluacionId_usuarioId: {
                    evaluacionId: Number(evaluacionId),
                    usuarioId: user.id
                }
            }
        });

        if (!participante) {
            return reply.code(403).send({ message: 'No es participante de esta defensa' });
        }

        // Actualizar calificación del participante
        const participanteActualizado = await prisma.participanteDefensaPublica.update({
            where: {
                evaluacionId_usuarioId: {
                    evaluacionId: Number(evaluacionId),
                    usuarioId: user.id
                }
            },
            data: {
                calificacion: calificacion ? Number(calificacion) : null,
                comentario
            }
        });

        // Calcular promedio de calificaciones si todos han calificado
        const todosParticipantes = await prisma.participanteDefensaPublica.findMany({
            where: { evaluacionId: Number(evaluacionId) }
        });

        const calificaciones = todosParticipantes
            .map(p => Number(p.calificacion))
            .filter(c => c !== null && !isNaN(c)) as number[];

        if (calificaciones.length === todosParticipantes.length && calificaciones.length > 0) {
            const promedio = calificaciones.reduce((a, b) => a + b, 0) / calificaciones.length;

            await prisma.evaluacionDefensaPublica.update({
                where: { id: Number(evaluacionId) },
                data: {
                    calificacion: promedio,
                    fechaEvaluacion: new Date()
                }
            });
        }

        return participanteActualizado;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error calificando defensa' });
    }
};

/**
 * Finalizar defensa pública
 * Acceso: DIRECTOR, COORDINADOR
 */
export const finalizarDefensaPublica = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;
    const { id } = request.params as any;
    const { estado, comentarios } = request.body as any; // APROBADA o RECHAZADA

    try {
        // Verificar permisos
        if (!checkRole(user, ['DIRECTOR', 'COORDINADOR'])) {
            return reply.code(403).send({ message: 'Solo directores y coordinadores pueden finalizar defensas' });
        }

        if (!['APROBADA', 'RECHAZADA'].includes(estado)) {
            return reply.code(400).send({ message: 'Estado debe ser APROBADA o RECHAZADA' });
        }

        const defensa = await prisma.evaluacionDefensaPublica.update({
            where: { id: Number(id) },
            data: {
                estado,
                comentarios,
                fechaEvaluacion: new Date()
            }
        });

        return defensa;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error finalizando defensa pública' });
    }
};