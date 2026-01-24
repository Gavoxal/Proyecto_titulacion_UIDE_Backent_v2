import { FastifyReply, FastifyRequest } from 'fastify';

export const createEntregable = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { tipo, urlArchivo, propuestasId } = request.body as any;
    // Validar enum TipoEntregable manually or let Prisma/Schema handle it.

    try {
        const nuevoEntregable = await prisma.entregableFinal.create({
            data: {
                tipo,
                urlArchivo,
                propuestasId: Number(propuestasId)
            }
        });
        return reply.code(201).send(nuevoEntregable);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error subiendo entregable final' });
    }
};

export const getEntregablesByPropuesta = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { propuestaId } = request.params as any;

    try {
        const entregables = await prisma.entregableFinal.findMany({
            where: { propuestasId: Number(propuestaId) }
        });
        return entregables;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo entregables' });
    }
};

export const updateEntregable = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;
    const { urlArchivo } = request.body as any;

    try {
        const entregableActualizado = await prisma.entregableFinal.update({
            where: { id: Number(id) },
            data: { urlArchivo }
        });
        return entregableActualizado;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error actualizando entregable' });
    }
};
