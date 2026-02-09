import { FastifyReply, FastifyRequest } from 'fastify';

// Crear notificación
export const createNotificacion = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { usuarioId, mensaje } = request.body as any;

    try {
        const notificacion = await prisma.notificacion.create({
            data: {
                usuarioId: Number(usuarioId),
                mensaje,
                leido: false
            }
        });
        return reply.code(201).send(notificacion);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error creando notificación' });
    }
};

// Obtener notificaciones del usuario autenticado
export const getMyNotificaciones = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const usuario = request.user as any;

    try {
        const notificaciones = await prisma.notificacion.findMany({
            where: { usuarioId: usuario.id },
            orderBy: { fechaCreacion: 'desc' },
            take: 50 // Últimas 50 notificaciones
        });
        return notificaciones;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo notificaciones' });
    }
};

// Marcar notificación como leída
export const markAsRead = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;
    const usuario = request.user as any;

    try {
        // Verificar que la notificación pertenece al usuario
        const notificacion = await prisma.notificacion.findFirst({
            where: {
                id: Number(id),
                usuarioId: usuario.id
            }
        });

        if (!notificacion) {
            return reply.code(404).send({ message: 'Notificación no encontrada' });
        }

        const updated = await prisma.notificacion.update({
            where: { id: Number(id) },
            data: { leido: true }
        });

        return updated;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error actualizando notificación' });
    }
};

// Marcar todas como leídas
export const markAllAsRead = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const usuario = request.user as any;

    try {
        await prisma.notificacion.updateMany({
            where: {
                usuarioId: usuario.id,
                leido: false
            },
            data: { leido: true }
        });

        return reply.send({ message: 'Todas las notificaciones marcadas como leídas' });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error actualizando notificaciones' });
    }
};

// Contar notificaciones no leídas
export const getUnreadCount = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const usuario = request.user as any;

    try {
        const count = await prisma.notificacion.count({
            where: {
                usuarioId: usuario.id,
                leido: false
            }
        });
        return { count };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error contando notificaciones' });
    }
};

// Eliminar notificación
export const deleteNotificacion = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;
    const usuario = request.user as any;

    try {
        // Verificar que la notificación pertenece al usuario
        const notificacion = await prisma.notificacion.findFirst({
            where: {
                id: Number(id),
                usuarioId: usuario.id
            }
        });

        if (!notificacion) {
            return reply.code(404).send({ message: 'Notificación no encontrada' });
        }

        await prisma.notificacion.delete({
            where: { id: Number(id) }
        });

        return reply.code(204).send();
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error eliminando notificación' });
    }
};

// Función helper para crear notificaciones (para usar en otros controladores)
export const notifyDirector = async (prisma: any, mensaje: string) => {
    try {
        // Obtener todos los directores
        const directores = await prisma.usuario.findMany({
            where: { rol: 'DIRECTOR' },
            select: { id: true }
        });

        // Crear notificación para cada director
        const notificaciones = directores.map((director: any) => ({
            usuarioId: director.id,
            mensaje,
            leido: false
        }));

        if (notificaciones.length > 0) {
            await prisma.notificacion.createMany({
                data: notificaciones
            });
        }
    } catch (error) {
        console.error('Error creando notificaciones para directores:', error);
    }
};
