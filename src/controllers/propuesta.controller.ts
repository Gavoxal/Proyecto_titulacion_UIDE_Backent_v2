import { FastifyReply, FastifyRequest } from 'fastify';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import util from 'util';
import { fileURLToPath } from 'url';

const pump = util.promisify(pipeline);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createPropuesta = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    // Modificación para soportar multipart/form-data
    let fields: any = {};
    let uploadedFileUrl: string | null = null;
    let usuario: any = request.user; // Default from JWT

    // Verificar si es multipart
    if (request.isMultipart()) {
        const parts = request.parts();
        for await (const part of parts) {
            if (part.type === 'file') {
                // Guardar archivo
                const uploadDir = path.join(__dirname, '../../uploads/propuestas');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }
                const filename = `${Date.now()}-${part.filename.replace(/\s/g, '_')}`;
                const filepath = path.join(uploadDir, filename);
                await pump(part.file, fs.createWriteStream(filepath));
                uploadedFileUrl = `/api/v1/propuestas/file/${filename}`;
            } else {
                // Guardar campo
                fields[part.fieldname] = part.value;
            }
        }
    } else {
        // Fallback JSON (si se enviara como JSON puro)
        fields = request.body;
    }

    const {
        titulo,
        objetivos,
        areaConocimientoId,
        problematica,
        alcance,
        carrera,
        malla
    } = fields;

    // Priorizar archivo subido, sino usar URL enviada
    const archivoUrl = uploadedFileUrl || fields.archivoUrl;


    try {
        // 1. Validar Prerrequisitos - Usar nueva estructura
        const totalRequisitos = await prisma.catalogoPrerequisito.count({
            where: { activo: true }
        });

        const requisitosCumplidos = await prisma.estudiantePrerequisito.count({
            where: {
                fkEstudiante: usuario.id,
                cumplido: true
            }
        });

        if (requisitosCumplidos < totalRequisitos) {
            return reply.code(403).send({
                message: `No puedes crear una propuesta hasta que la Dirección valide todos tus prerrequisitos. Cumplidos: ${requisitosCumplidos}/${totalRequisitos}`
            });
        }

        // 2. Limitar a 3 propuestas máximo por estudiante
        const propCount = await prisma.propuesta.count({
            where: { fkEstudiante: usuario.id }
        });

        if (propCount >= 3) {
            return reply.code(403).send({
                message: 'No puedes crear más de 3 propuestas. Ya has alcanzado el límite permitido.'
            });
        }


        const nuevaPropuesta = await prisma.propuesta.create({
            data: {
                titulo,
                objetivos,
                areaConocimientoId: Number(areaConocimientoId),
                archivoUrl,
                problematica,
                alcance,
                fkEstudiante: usuario.id,
                estado: 'PENDIENTE',
                // Nuevos campos
                carrera,
                malla
            },
            include: {
                areaConocimiento: true
            }
        });

        // NOTIFICACIÓN: Verificar si completó las 3 propuestas
        const finalCount = await prisma.propuesta.count({
            where: { fkEstudiante: usuario.id }
        });

        if (finalCount === 3) {
            // Buscar Directores y Coordinadores
            const autoridades = await prisma.usuario.findMany({
                where: {
                    rol: { in: ['DIRECTOR', 'COORDINADOR'] }
                }
            });

            // Crear notificaciones en BD
            const notificacionesData = autoridades.map(auth => ({
                usuarioId: auth.id,
                mensaje: `El estudiante ${usuario.nombres} ${usuario.apellidos} ha completado el envío de sus 3 propuestas de titulación.`,
                leido: false
            }));

            if (notificacionesData.length > 0) {
                await prisma.notificacion.createMany({
                    data: notificacionesData
                });
            }

            // Enviar correos a autoridades
            // Import dinámico si es necesario o asumir que ya está importado arriba (lo añadiré)
            const { sendProposalsCompletedEmail } = await import('../services/email.service.js');

            for (const auth of autoridades) {
                if (auth.correoInstitucional) {
                    await sendProposalsCompletedEmail(auth.correoInstitucional, `${auth.nombres} ${auth.apellidos}`, `${usuario.nombres} ${usuario.apellidos}`);
                }
            }
        }

        return reply.code(201).send(nuevaPropuesta);
    } catch (error) {
        request.log.error(error);
        console.error("Error creating proposal:", error);
        return reply.code(500).send({ message: 'Error creando propuesta' });
    }
};

export const getPropuestas = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const usuario = request.user as any;

    try {
        console.log(`[DEBUG] getPropuestas - User Role: ${usuario.rol}, ID: ${usuario.id}`);
        let where: any = {};

        // Use all-caps directly as defined in Rol enum
        if (usuario.rol === 'ESTUDIANTE') {
            where = { fkEstudiante: Number(usuario.id) };
        } else if (usuario.rol === 'TUTOR') {
            where = {
                trabajosTitulacion: {
                    some: { fkTutorId: Number(usuario.id) }
                }
            };
        }

        // Permitir filtrar por estudianteId si es DIRECTOR o COORDINADOR
        const { estudianteId } = request.query as any;
        if (estudianteId && ['DIRECTOR', 'COORDINADOR'].includes(usuario.rol)) {
            const eid = Number(estudianteId);
            if (!isNaN(eid)) {
                // Verificar si hay propuestas con este fkEstudiante
                const studentProps = await prisma.propuesta.findMany({
                    where: { fkEstudiante: eid },
                    select: { id: true }
                });

                if (studentProps.length > 0) {
                    where.fkEstudiante = eid;
                } else {
                    // Fallback: ¿Es el ID de una propuesta individual?
                    const singleProp = await prisma.propuesta.findUnique({
                        where: { id: eid },
                        select: { fkEstudiante: true }
                    });
                    if (singleProp) {
                        where.fkEstudiante = singleProp.fkEstudiante;
                    } else {
                        where.fkEstudiante = eid;
                    }
                }
            } else if (estudianteId === 'undefined') {
                // Manejar error común de frontend
                return reply.code(400).send({ message: 'ID de estudiante inválido (undefined)' });
            }
        }

        console.log(`[DEBUG] getPropuestas WHERE clause:`, JSON.stringify(where));

        const propuestas = await prisma.propuesta.findMany({
            where,
            include: {
                estudiante: {
                    include: {
                        estudiantePerfil: true
                    }
                },
                areaConocimiento: true,
                votacionesTutor: {
                    include: {
                        tutor: {
                            select: { nombres: true, apellidos: true }
                        }
                    }
                },
                comentarios: {
                    include: {
                        usuario: {
                            select: { nombres: true, apellidos: true, rol: true }
                        }
                    },
                    orderBy: { id: 'asc' }
                },
                trabajosTitulacion: {
                    where: { estadoAsignacion: 'ACTIVO' },
                    include: {
                        tutor: {
                            select: { nombres: true, apellidos: true, correoInstitucional: true }
                        }
                    }
                },
                entregablesFinales: true
            }
        });
        console.log(`[DEBUG] Propuestas found: ${propuestas.length}`);
        return propuestas;
    } catch (error: any) {
        request.log.error(`[ERROR] getPropuestas: ${error.message}`);
        console.error("Full Error Prisma getPropuestas:", error);
        return reply.code(500).send({
            message: 'Error obteniendo propuestas',
            error: error.message,
            prismaError: error.code // Prisma error code if available
        });
    }
};

export const getPropuestaById = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;

    try {
        const propostaId = Number(id);
        if (isNaN(propostaId)) {
            return reply.code(400).send({ message: 'ID de propuesta inválido' });
        }

        const propuesta = await prisma.propuesta.findUnique({
            where: { id: propostaId },
            include: {
                estudiante: {
                    select: { nombres: true, apellidos: true, cedula: true }
                },
                areaConocimiento: true,
                actividades: {
                    include: {
                        evidencias: true
                    }
                },
                trabajosTitulacion: {
                    include: {
                        tutor: true
                    }
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
    // Permitir update de tutorId, fechaDefensa, resultadoDefensa, etc.

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
        const propId = Number(id);
        if (estado === 'APROBADA') {
            // Obtener la propuesta para saber a qué estudiante pertenece
            const currentProp = await prisma.propuesta.findUnique({
                where: { id: propId }
            });
            if (!currentProp) return reply.code(404).send({ message: 'Propuesta no encontrada' });

            // Verificar si el estudiante ya tiene una propuesta aprobada (distinta a esta)
            const approvedExists = await prisma.propuesta.findFirst({
                where: {
                    fkEstudiante: currentProp.fkEstudiante,
                    estado: 'APROBADA',
                    id: { not: propId }
                }
            });

            if (approvedExists) {
                return reply.code(409).send({ message: 'El estudiante ya tiene una propuesta aprobada. No se puede aprobar otra.' });
            }
        }

        const propuestaActualizada = await prisma.propuesta.update({
            where: { id: propId },
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

/**
 * Revisar propuesta (DIRECTOR/COORDINADOR)
 * Acceso: DIRECTOR, COORDINADOR
 */
export const revisarPropuesta = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;
    const { estadoRevision, comentariosRevision } = request.body as any;
    const usuario = request.user as any;

    try {
        const propId = Number(id);
        // Verificar que sea DIRECTOR o COORDINADOR
        if (!['DIRECTOR', 'COORDINADOR'].includes(usuario.rol)) {
            return reply.code(403).send({ message: 'Solo directores y coordinadores pueden revisar propuestas' });
        }

        if (estadoRevision === 'APROBADA') {
            // Obtener la propuesta para saber a qué estudiante pertenece
            const currentProp = await prisma.propuesta.findUnique({
                where: { id: propId }
            });
            if (!currentProp) return reply.code(404).send({ message: 'Propuesta no encontrada' });

            // Verificar si el estudiante ya tiene una propuesta aprobada (distinta a esta)
            const approvedExists = await prisma.propuesta.findFirst({
                where: {
                    fkEstudiante: currentProp.fkEstudiante,
                    estado: 'APROBADA',
                    id: { not: propId }
                }
            });

            if (approvedExists) {
                return reply.code(409).send({ message: 'El estudiante ya tiene una propuesta aprobada. No se puede aprobar otra.' });
            }
        }

        const propuestaActualizada = await prisma.propuesta.update({
            where: { id: propId },
            data: {
                estado: estadoRevision,
                comentarioRevision: comentariosRevision,
                fechaRevision: new Date()
            }
        });

        // NOTIFICACIÓN: Si se aprueba, notificar al estudiante
        if (estadoRevision === 'APROBADA') {
            try {
                await prisma.notificacion.create({
                    data: {
                        usuarioId: propuestaActualizada.fkEstudiante,
                        mensaje: `Tu propuesta "${propuestaActualizada.titulo}" ha sido aprobada.`,
                        leido: false
                    }
                });
            } catch (notifErr) {
                request.log.error(`Error creando notificación: ${notifErr}`);
                // No bloqueamos la respuesta principal por error en notificación
            }
        } else if (estadoRevision === 'RECHAZADA' || estadoRevision === 'APROBADA_CON_COMENTARIOS') {
            try {
                const tipo = estadoRevision === 'RECHAZADA' ? 'rechazada' : 'observada';
                await prisma.notificacion.create({
                    data: {
                        usuarioId: propuestaActualizada.fkEstudiante,
                        mensaje: `Tu propuesta "${propuestaActualizada.titulo}" ha sido ${tipo}. Por favor revisa los comentarios.`,
                        leido: false
                    }
                });
            } catch (notifErr) {
                request.log.error(`Error creando notificación: ${notifErr}`);
            }
        }

        return propuestaActualizada;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error revisando propuesta' });
    }
};

export const uploadPropuestaFile = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = await request.file();
        if (!data) {
            return reply.code(400).send({ message: 'No se subió ningún archivo' });
        }

        const uploadDir = path.join(__dirname, '../../uploads/propuestas');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const timestamp = Date.now();
        const filename = `${timestamp}-${data.filename.replace(/\s/g, '_')}`;
        const filepath = path.join(uploadDir, filename);

        await pump(data.file, fs.createWriteStream(filepath));

        const fileUrl = `/api/v1/propuestas/file/${filename}`;

        return reply.code(200).send({ url: fileUrl });
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error subiendo archivo' });
    }
};

export const servePropuestaFile = async (request: FastifyRequest, reply: FastifyReply) => {
    const { filename } = request.params as any;
    const uploadDir = path.join(__dirname, '../../uploads/propuestas');
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
