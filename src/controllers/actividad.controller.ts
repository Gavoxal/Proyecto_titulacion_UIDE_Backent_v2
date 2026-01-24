import { FastifyReply, FastifyRequest } from 'fastify';

// ACTIVIDADES

export const createActividad = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { nombre, descripcion, propuestasId } = request.body as any;
    const usuario = request.user as any;

    try {
        const nuevaActividad = await prisma.actividad.create({
            data: {
                nombre,
                descripcion,
                propuestasId: Number(propuestasId),
                usuariosId: usuario.id
            }
        });
        return reply.code(201).send(nuevaActividad);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error creando actividad' });
    }
};

export const getActividadesByPropuesta = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { propuestaId } = request.params as any;

    try {
        const actividades = await prisma.actividad.findMany({
            where: { propuestasId: Number(propuestaId) },
            include: {
                evidencias: true
            }
        });
        return actividades;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo actividades' });
    }
};

export const getActividadById = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;

    try {
        const actividad = await prisma.actividad.findUnique({
            where: { idActividades: Number(id) },
            include: { evidencias: true }
        });

        if (!actividad) {
            return reply.code(404).send({ message: 'Actividad no encontrada' });
        }
        return actividad;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo actividad' });
    }
};

export const updateActividad = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;
    const data = request.body as any;

    try {
        const actividadActualizada = await prisma.actividad.update({
            where: { idActividades: Number(id) },
            data
        });
        return actividadActualizada;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error actualizando actividad' });
    }
};

export const deleteActividad = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;

    try {
        await prisma.actividad.delete({
            where: { idActividades: Number(id) }
        });
        return reply.code(204).send();
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error eliminando actividad' });
    }
};


// EVIDENCIAS

export const createEvidencia = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { actividadId } = request.params as any;
    const { semana, contenido, archivoUrl } = request.body as any;

    try {
        const nuevaEvidencia = await prisma.evidencia.create({
            data: {
                semana: Number(semana),
                contenido,
                archivoUrl,
                actividadesId: Number(actividadId),
                estado: 'ENTREGADO'
            }
        });

        return reply.code(201).send(nuevaEvidencia);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error creando evidencia' });
    }
};

export const getEvidenciaById = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;

    try {
        const evidencia = await prisma.evidencia.findUnique({
            where: { id: Number(id) },
            include: { comentarios: true }
        });

        if (!evidencia) {
            return reply.code(404).send({ message: 'Evidencia no encontrada' });
        }
        return evidencia;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo evidencia' });
    }
};

export const updateEvidencia = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;
    const { contenido, archivoUrl } = request.body as any;

    try {
        const evidenciaActualizada = await prisma.evidencia.update({
            where: { id: Number(id) },
            data: { contenido, archivoUrl }
        });
        return evidenciaActualizada;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error actualizando evidencia' });
    }
};

export const deleteEvidencia = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;

    try {
        await prisma.evidencia.delete({
            where: { id: Number(id) }
        });
        return reply.code(204).send();
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error eliminando evidencia' });
    }
};

export const updateEvidenciaNota = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;
    const { calificacion, comentarios } = request.body as any;

    const usuario = request.user as any;

    try {
        // 1. Actualizar nota
        if (calificacion !== undefined) {
            await prisma.evidencia.update({
                where: { id: Number(id) },
                data: { calificacion: Number(calificacion) }
            });
        }

        // 2. Crear comentario si existe
        if (comentarios) {
            await prisma.comentario.create({
                data: {
                    descripcion: comentarios,
                    evidenciaId: Number(id),
                    usuariosId: usuario.id
                }
            });
        }

        const evidenciaActualizada = await prisma.evidencia.findUnique({
            where: { id: Number(id) },
            include: { comentarios: true }
        });

        return evidenciaActualizada;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error calificando evidencia' });
    }
};
