import { FastifyReply, FastifyRequest } from 'fastify';

export const asignarJurado = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { usuarioId, propuestaId, rol } = request.body as any;

    try {
        const asignacion = await prisma.comite.create({
            data: {
                usuariosId: Number(usuarioId),
                propuestasId: Number(propuestaId),
                rol, // JURADO_1, JURADO_2, PRESIDENTE
                fechaAsignada: new Date()
            }
        });
        return reply.code(201).send(asignacion);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error asignando jurado' });
    }
};

export const getComiteByPropuesta = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { propuestaId } = request.params as any;

    try {
        const comite = await prisma.comite.findMany({
            where: { propuestasId: Number(propuestaId) },
            include: {
                usuario: {
                    select: { nombres: true, apellidos: true, correoInstitucional: true, rol: true }
                }
            }
        });
        return comite;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo comité' });
    }
};

export const agendarDefensa = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { propuestaId } = request.params as any;
    const { fechaDefensa } = request.body as any;

    // La fecha de defensa es para toda la propuesta, pero está en la tabla de relación Comite.
    // Vamos a actualizarla para todos los miembros del comité de esa propuesta.

    try {
        await prisma.comite.updateMany({
            where: { propuestasId: Number(propuestaId) },
            data: { fechaDefensa: new Date(fechaDefensa) }
        });
        return reply.send({ message: 'Fecha de defensa actualizada para el tribunal' });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error agendando defensa' });
    }
};

export const calificarDefensa = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { propuestaId } = request.params as any;
    const { calificacion, resultado } = request.body as any;
    const usuario = request.user as any;

    try {
        // Un jurado califica SU asignacion
        // findFirst porque la PK es compuesta y no la tengo en params (tengo propuestaId y usuario logueado)
        const asignacion = await prisma.comite.findFirst({
            where: {
                propuestasId: Number(propuestaId),
                usuariosId: usuario.id
            }
        });

        if (!asignacion) {
            return reply.code(404).send({ message: 'No eres parte del comité de esta propuesta' });
        }

        await prisma.comite.update({
            where: {
                usuariosId_propuestasId: {
                    usuariosId: usuario.id,
                    propuestasId: Number(propuestaId)
                }
            },
            data: {
                calificacion: Number(calificacion),
                resultadoDefensa: resultado // APROBADO, REPROBADO
            }
        });

        return reply.send({ message: 'Calificación registrada' });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error calificando defensa' });
    }
};
