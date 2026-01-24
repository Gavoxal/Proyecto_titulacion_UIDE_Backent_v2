import { FastifyReply, FastifyRequest } from 'fastify';

export const createPropuesta = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { titulo, objetivos, areaInvestigacion, archivoUrl, problematica, alcance } = request.body as any;
    const usuario = request.user as any; // From JWT

    try {
        const nuevaPropuesta = await prisma.propuesta.create({
            data: {
                titulo,
                objetivos,
                areaInvestigacion,
                archivoUrl,
                problematica,
                alcance,
                fkEstudiante: usuario.id,
                estado: 'PENDIENTE'
            }
        });
        return reply.code(201).send(nuevaPropuesta);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error creando propuesta' });
    }
};

export const getPropuestas = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const usuario = request.user as any;

    try {
        let where = {};
        // Si es estudiante, solo ver sus propuestas
        if (usuario.rol === 'ESTUDIANTE') {
            where = { fkEstudiante: usuario.id };
        }

        const propuestas = await prisma.propuesta.findMany({
            where,
            include: {
                estudiante: {
                    select: { nombres: true, apellidos: true, cedula: true }
                }
            }
        });
        return propuestas;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo propuestas' });
    }
};

export const getPropuestaById = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;

    try {
        const propuesta = await prisma.propuesta.findUnique({
            where: { id: Number(id) },
            include: {
                estudiante: {
                    select: { nombres: true, apellidos: true, cedula: true }
                }
            }
        });

        if (!propuesta) {
            return reply.code(404).send({ message: 'Propuesta no encontrada' });
        }
        return propuesta;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo propuesta' });
    }
};

export const updatePropuesta = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;
    const data = request.body as any;
    // Remover campos sensibles si los hubiera. Estado se actualiza en ruta especial.
    delete data.estado;
    delete data.fkEstudiante;

    try {
        const propuestaActualizada = await prisma.propuesta.update({
            where: { id: Number(id) },
            data: {
                ...data
            }
        });
        return propuestaActualizada;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error actualizando propuesta' });
    }
};

export const deletePropuesta = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;

    try {
        await prisma.propuesta.delete({
            where: { id: Number(id) }
        });
        return reply.code(204).send();
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error eliminando propuesta' });
    }
};

export const updateEstadoPropuesta = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;
    const { estado } = request.body as any;

    try {
        const propuestaActualizada = await prisma.propuesta.update({
            where: { id: Number(id) },
            data: {
                estado
            }
        });
        return propuestaActualizada;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error actualizando propuesta' });
    }
};
