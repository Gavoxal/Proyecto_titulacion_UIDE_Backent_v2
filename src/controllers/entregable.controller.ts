import { FastifyReply, FastifyRequest } from 'fastify';

export const createEntregable = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const parts = request.parts();

    let tipo: any;
    let propuestasId: any;
    let archivoUrl: string | undefined;
    let fileProcessed = false;

    // Helper imports for file saving
    const fs = await import('fs');
    const path = await import('path');
    const util = await import('util');
    const { pipeline } = await import('stream');
    const pump = util.promisify(pipeline);

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), 'uploads', 'entregables');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    try {
        for await (const part of parts) {
            if (part.type === 'file') {
                if (part.fieldname === 'file') {
                    const timestamp = Date.now();
                    const filename = `entregable_${timestamp}_${part.filename.replace(/\s/g, '_')}`;
                    const savePath = path.join(uploadDir, filename);

                    await pump(part.file, fs.createWriteStream(savePath));
                    archivoUrl = `/uploads/entregables/${filename}`;
                    fileProcessed = true;
                } else {
                    await part.toBuffer();
                }
            } else {
                if (part.fieldname === 'tipo') tipo = (part as any).value;
                if (part.fieldname === 'propuestasId') propuestasId = (part as any).value;
            }
        }

        if (!tipo || !propuestasId || !fileProcessed || !archivoUrl) {
            return reply.code(400).send({ message: 'Faltan datos (tipo, propuestasId, file)' });
        }

        const propId = Number(propuestasId);

        const result = await prisma.$transaction(async (tx) => {
            const existingActive = await tx.entregableFinal.findFirst({
                where: { propuestasId: propId, tipo: tipo, isActive: true }
            });

            let newVersion = 1;
            if (existingActive) {
                newVersion = existingActive.version + 1;
                await tx.entregableFinal.update({
                    where: { id: existingActive.id },
                    data: { isActive: false }
                });
            }

            return await tx.entregableFinal.create({
                data: {
                    tipo,
                    urlArchivo: archivoUrl!,
                    propuestasId: propId,
                    version: newVersion,
                    isActive: true
                }
            });
        });

        return reply.code(201).send(result);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error subiendo entregable final' });
    }
};

export const serveEntregableFile = async (request: FastifyRequest, reply: FastifyReply) => {
    const { filename } = request.params as any;
    const path = await import('path');
    const fs = await import('fs');

    const uploadDir = path.join(process.cwd(), 'uploads', 'entregables');
    const filePath = path.join(uploadDir, filename);

    if (!filePath.startsWith(uploadDir)) {
        return reply.code(403).send({ message: 'Acceso denegado' });
    }

    if (!fs.existsSync(filePath)) {
        return reply.code(404).send({ message: 'Archivo no encontrado' });
    }

    const stream = fs.createReadStream(filePath);
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';

    reply.header('Content-Type', contentType);
    return reply.send(stream);
};

export const getEntregablesByPropuesta = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { propuestaId } = request.params as any;
    const { history } = request.query as any;

    try {
        const whereClause: any = { propuestasId: Number(propuestaId) };

        // Si no piden historial explícitamente, solo devolver activos
        if (history !== 'true') {
            whereClause.isActive = true;
        }

        const entregables = await prisma.entregableFinal.findMany({
            where: whereClause,
            orderBy: {
                version: 'desc' // Mostrar la versión más reciente primero
            }
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
export const getUnlockStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const user = request.user as any;

    try {
        // Contar evidencias aprobadas del estudiante actual
        // Relacion: Usuario -> Propuesta -> Actividad -> Evidencia
        const approvedCount = await prisma.evidencia.count({
            where: {
                estadoRevisionTutor: 'APROBADO',
                actividad: {
                    propuesta: {
                        fkEstudiante: user.id
                    }
                }
            }
        });

        return {
            unlocked: approvedCount >= 16,
            approvedWeeks: approvedCount,
            requiredWeeks: 16
        };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error consultando estado de desbloqueo' });
    }
};
