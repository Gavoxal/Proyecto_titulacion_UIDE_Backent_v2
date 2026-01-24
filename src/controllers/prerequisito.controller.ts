import { FastifyReply, FastifyRequest } from 'fastify';

export const createPrerequisito = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { nombre, descripcion, archivoUrl } = request.body as any;
    const usuario = request.user as any;

    try {
        const nuevoPrerequisito = await prisma.prerequisito.create({
            data: {
                nombre,
                descripcion,
                archivoUrl,
                fkEstudiante: usuario.id,
                cumplido: false
            }
        });
        return reply.code(201).send(nuevoPrerequisito);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error subiendo prerrequisito' });
    }
};

export const getPrerequisitos = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const usuario = request.user as any;
    const { estudianteId } = request.query as any; // Allow filtering by student for admins

    try {
        let where = {};
        if (usuario.rol === 'ESTUDIANTE') {
            where = { fkEstudiante: usuario.id };
        } else if (estudianteId) {
            where = { fkEstudiante: Number(estudianteId) };
        }

        const prerequisitos = await prisma.prerequisito.findMany({
            where,
            include: {
                estudiante: {
                    select: { nombres: true, apellidos: true, cedula: true }
                }
            }
        });
        return prerequisitos;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo prerrequisitos' });
    }
};

export const validatePrerequisito = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;
    const { cumplido } = request.body as any; // Boolean

    try {
        const prerequisitoActualizado = await prisma.prerequisito.update({
            where: { id: Number(id) },
            data: { cumplido: Boolean(cumplido) }
        });
        return prerequisitoActualizado;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error validando prerrequisito' });
    }
};

export const deletePrerequisito = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;

    try {
        await prisma.prerequisito.delete({
            where: { id: Number(id) }
        });
        return reply.code(204).send();
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error eliminando prerrequisito' });
    }
};
