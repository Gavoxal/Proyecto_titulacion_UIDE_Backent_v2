import { FastifyReply, FastifyRequest } from 'fastify';

export const createComentario = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { descripcion, evidenciaId } = request.body as any;
    const usuario = request.user as any;

    try {
        const nuevoComentario = await prisma.comentario.create({
            data: {
                descripcion,
                evidenciaId: Number(evidenciaId),
                usuariosId: usuario.id
            }
        });
        return reply.code(201).send(nuevoComentario);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error creando comentario' });
    }
};

export const getComentariosByEvidencia = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { evidenciaId } = request.params as any;

    try {
        const comentarios = await prisma.comentario.findMany({
            where: { evidenciaId: Number(evidenciaId) },
            include: {
                usuario: {
                    select: { nombres: true, apellidos: true, rol: true }
                }
            }
        });
        return comentarios;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo comentarios' });
    }
};

export const deleteComentario = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;
    const usuario = request.user as any;

    try {
        const comentario = await prisma.comentario.findUnique({ where: { idComentarios: Number(id) } });

        if (!comentario) {
            return reply.code(404).send({ message: 'Comentario no encontrado' });
        }

        // Solo el autor o un admin puede borrar
        if (comentario.usuariosId !== usuario.id && !['DIRECTOR', 'COORDINADOR'].includes(usuario.rol)) {
            return reply.code(403).send({ message: 'No tienes permiso para eliminar este comentario' });
        }

        await prisma.comentario.delete({
            where: { idComentarios: Number(id) }
        });
        return reply.code(204).send();
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error eliminando comentario' });
    }
};
