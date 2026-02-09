import { FastifyReply, FastifyRequest } from 'fastify';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import util from 'util';
import { fileURLToPath } from 'url';
import { notifyDirector } from './notificacion.controller.js';


const pump = util.promisify(pipeline);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

// Asegurar que directorio existe
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ============================================
// CRUD para Catálogo de Prerrequisitos (Admin)
// ============================================

export const getCatalogoPrerequisitos = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;

    try {
        const catalogo = await prisma.catalogoPrerequisito.findMany({
            where: { activo: true },
            orderBy: { orden: 'asc' }
        });
        return catalogo;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo catálogo de prerrequisitos' });
    }
};

export const createCatalogoPrerequisito = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { nombre, descripcion, orden } = request.body as any;

    try {
        const nuevoRequisito = await prisma.catalogoPrerequisito.create({
            data: { nombre, descripcion, orden: orden || 1, activo: true }
        });
        return reply.code(201).send(nuevoRequisito);
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error creando prerrequisito en catálogo' });
    }
};

// ============================================
// CRUD para Cumplimiento de Prerrequisitos (Estudiantes)
// ============================================

export const createEstudiantePrerequisito = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { prerequisitoId, archivoUrl } = request.body as any;
    const userAuth = request.user as any;

    try {
        // Fetch complete user info to get names
        const usuario = await prisma.usuario.findUnique({
            where: { id: userAuth.id }
        });

        if (!usuario) {
            return reply.code(404).send({ message: 'Usuario no encontrado' });
        }

        // Obtener información del prerequisito del catálogo
        const catalogoPrereq = await prisma.catalogoPrerequisito.findUnique({
            where: { id: Number(prerequisitoId) }
        });

        // Verificar si ya existe el registro:
        const existente = await prisma.estudiantePrerequisito.findUnique({
            where: {
                fkEstudiante_prerequisitoId: {
                    fkEstudiante: usuario.id,
                    prerequisitoId: Number(prerequisitoId)
                }
            }
        });

        let resultado;
        if (existente) {
            // Actualizar si ya existe
            resultado = await prisma.estudiantePrerequisito.update({
                where: {
                    fkEstudiante_prerequisitoId: {
                        fkEstudiante: usuario.id,
                        prerequisitoId: Number(prerequisitoId)
                    }
                },
                data: {
                    archivoUrl: archivoUrl,
                    cumplido: false // Reset a false hasta que el director valide
                }
            });

            // Notificar al director sobre la actualización
            await notifyDirector(
                prisma,
                `${usuario.nombres} ${usuario.apellidos} ha actualizado el prerequisito: ${catalogoPrereq?.nombre || 'Prerequisito'}`
            );

            return reply.code(200).send(resultado);
        } else {
            // Crear uno nuevo si no existe
            resultado = await prisma.estudiantePrerequisito.create({
                data: {
                    fkEstudiante: usuario.id,
                    prerequisitoId: Number(prerequisitoId),
                    archivoUrl: archivoUrl,
                    cumplido: false
                }
            });

            // Notificar al director sobre el nuevo prerequisito
            await notifyDirector(
                prisma,
                `${usuario.nombres} ${usuario.apellidos} ha enviado el prerequisito: ${catalogoPrereq?.nombre || 'Prerequisito'} para revisión`
            );

            return reply.code(201).send(resultado);
        }
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error al procesar el prerrequisito' });
    }
};

export const getEstudiantePrerequisitos = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const usuario = request.user as any;
    const { estudianteId } = request.query as any;

    try {
        let fkEstudiante = usuario.id;

        // Si es director/coordinador, puede ver de cualquier estudiante
        const userRole = usuario.rol ? usuario.rol.toUpperCase() : '';
        if ((userRole === 'DIRECTOR' || userRole === 'COORDINADOR') && estudianteId) {
            fkEstudiante = Number(estudianteId);
        }

        // 1. Obtener catálogo activo
        const catalogo = await prisma.catalogoPrerequisito.findMany({
            where: { activo: true },
            orderBy: { orden: 'asc' }
        });

        // 2. Obtener lo que el estudiante ha subido
        const misPrerequisitos = await prisma.estudiantePrerequisito.findMany({
            where: { fkEstudiante },
            include: {
                prerequisito: true
            }
        });

        // 3. Combinar para mostrar estado completo
        const resultado = catalogo.map(req => {
            const envio = misPrerequisitos.find(p => p.prerequisitoId === req.id);

            // Determinar código para el frontend
            let codigo = 'other';
            const n = req.nombre.toLowerCase();
            if (n.includes('ingl')) codigo = 'english';
            else if (n.includes('vincula')) codigo = 'community';
            else if (n.includes('ctica') || n.includes('practica')) codigo = 'internship';

            return {
                id: req.id, // ID del requisito (del catálogo)
                nombre: req.nombre,
                codigo: codigo, // Clave para el frontend
                descripcion: req.descripcion,
                orden: req.orden,
                // Estado del estudiante
                estudiantePrerequisitoId: envio ? envio.id : null,
                entregado: !!envio,
                cumplido: envio ? envio.cumplido : false,
                archivoUrl: envio ? envio.archivoUrl : null,
                fechaCumplimiento: envio ? envio.fechaCumplimiento : null,
                fechaActualizacion: envio ? (envio as any).fechaActualizacion : null,
                observaciones: envio ? 'En revisión' : 'Pendiente'
            };
        });

        return resultado;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo prerrequisitos' });
    }
};

// Importar email service
import { sendPlatformAccessEmail } from '../services/email.service.js';

export const validatePrerequisito = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;
    const { cumplido } = request.body as any;

    try {
        const prerequisitoActualizado = await prisma.estudiantePrerequisito.update({
            where: { id: Number(id) },
            data: {
                cumplido: Boolean(cumplido),
                fechaCumplimiento: cumplido ? new Date() : null
            },
            include: { estudiante: true } // Incluir estudiante para obtener email
        });

        // Verificar si completó TODOS los requisitos
        if (cumplido) {
            const estudianteId = prerequisitoActualizado.fkEstudiante;

            // Contar cumplidos
            const countCumplidos = await prisma.estudiantePrerequisito.count({
                where: { fkEstudiante: estudianteId, cumplido: true }
            });

            // Contar totales activos
            const countTotales = await prisma.catalogoPrerequisito.count({
                where: { activo: true }
            });

            // Si cumplio todo, enviar correo y notificación
            if (countCumplidos === countTotales && countTotales > 0) {
                const est = prerequisitoActualizado.estudiante;

                // 1. Enviar Correo
                await sendPlatformAccessEmail(
                    est.correoInstitucional,
                    `${est.nombres} ${est.apellidos}`
                );

                // 2. Crear Notificación en App
                await prisma.notificacion.create({
                    data: {
                        usuarioId: est.id,
                        mensaje: '¡Felicidades! Se ha habilitado tu acceso a la plataforma de titulación.',
                        leido: false
                    }
                });
            }
        }

        return prerequisitoActualizado;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error validando prerrequisito' });
    }
};

export const deleteEstudiantePrerequisito = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;

    try {
        await prisma.estudiantePrerequisito.delete({
            where: { id: Number(id) }
        });
        return reply.code(204).send();
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error eliminando prerrequisito' });
    }
};

// ============================================
// Dashboard para Director/Coordinador
// ============================================

export const getPrerequisitosDashboard = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;

    try {
        // 1. Obtener catálogo de prerrequisitos
        const catalogo = await prisma.catalogoPrerequisito.findMany({
            where: { activo: true },
            orderBy: { orden: 'asc' }
        });

        // 2. Obtener todos los estudiantes con sus cumplimientos
        const estudiantes = await prisma.usuario.findMany({
            where: { rol: 'ESTUDIANTE' },
            select: {
                id: true,
                nombres: true,
                apellidos: true,
                cedula: true,
                estudiantePerfil: {
                    select: {
                        escuela: true,
                        malla: true
                    }
                },

                prerequisitos: {
                    include: {
                        prerequisito: true
                    }
                }
            }
        });

        console.log(`[DEBUG] getPrerequisitosDashboard: Found ${estudiantes.length} students`);
        if (estudiantes.length > 0) {
            console.log(`[DEBUG] First student sample:`, estudiantes[0]);
        }

        // 3. Transformar data para el dashboard
        const dataDashboard = estudiantes.map((estudiante: any) => {
            const cumplimientos = estudiante.prerequisitos || [];

            // Mapear cada requisito del catálogo
            const requisitos = catalogo.map(req => {
                const cumplimiento = cumplimientos.find((c: any) => c.prerequisitoId === req.id);
                return {
                    id: req.id,
                    nombre: req.nombre,
                    estudiantePrerequisitoId: cumplimiento ? cumplimiento.id : null, // ID para validación
                    completed: !!cumplimiento, // Si existe registro
                    verified: cumplimiento ? cumplimiento.cumplido : false, // Si está validado
                    file: cumplimiento ? cumplimiento.archivoUrl : null,
                    fechaCumplimiento: cumplimiento ? cumplimiento.fechaCumplimiento : null
                };
            });

            // Access granted solo si todos están verified
            const accessGranted = requisitos.every(r => r.verified);

            return {
                id: estudiante.id,
                name: `${estudiante.nombres} ${estudiante.apellidos}`,
                cedula: estudiante.cedula,
                career: estudiante.estudiantePerfil?.escuela || 'N/A',
                malla: estudiante.estudiantePerfil?.malla || 'N/A',

                prerequisitos: requisitos,
                accessGranted,
                totalRequisitos: catalogo.length,
                cumplidos: requisitos.filter(r => r.verified).length
            };
        });

        return dataDashboard;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error generando dashboard de requisitos' });
    }
};

// ============================================
// Verificar si estudiante puede crear propuesta
// ============================================

export const checkCanCreatePropuesta = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const usuario = request.user as any;

    try {
        // Contar prerrequisitos cumplidos
        const cumplidos = await prisma.estudiantePrerequisito.count({
            where: {
                fkEstudiante: usuario.id,
                cumplido: true
            }
        });

        // Contar total de prerrequisitos activos
        const totalRequisitos = await prisma.catalogoPrerequisito.count({
            where: { activo: true }
        });

        const canCreate = cumplidos === totalRequisitos && totalRequisitos > 0;

        return {
            canCreate,
            cumplidos,
            totalRequisitos,
            message: canCreate
                ? 'Puedes crear tu propuesta'
                : `Te faltan ${totalRequisitos - cumplidos} prerrequisito(s) por cumplir`
        };
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error verificando prerrequisitos' });
    }
};

// ============================================
// Manejo de Archivos (Subida y Descarga)
// ============================================

export const uploadPrerequisitoFile = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        const data = await request.file();

        if (!data) {
            return reply.code(400).send({ message: 'No se subió ningún archivo' });
        }

        const filename = `${Date.now()}-${data.filename.replace(/\s/g, '_')}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        await pump(data.file, fs.createWriteStream(filepath));

        // URL relativa para servir el archivo
        const fileUrl = `/api/v1/prerequisitos/file/${filename}`;

        return reply.code(200).send({
            message: 'Archivo subido correctamente',
            url: fileUrl,
            filename: filename
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error subiendo archivo' });
    }
};

export const servePrerequisitoFile = async (request: FastifyRequest, reply: FastifyReply) => {
    const { filename } = request.params as any;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Seguridad básica path traversal
    if (!filepath.startsWith(UPLOAD_DIR)) {
        return reply.code(403).send({ message: 'Acceso denegado' });
    }

    if (!fs.existsSync(filepath)) {
        return reply.code(404).send({ message: 'Archivo no encontrado' });
    }

    const stream = fs.createReadStream(filepath);
    const ext = path.extname(filename).toLowerCase();

    let contentType = 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';

    reply.header('Content-Type', contentType);
    return reply.send(stream);
};

// ============================================
// Habilitar Acceso a Plataforma (Acción Explícita del Director)
// ============================================

export const enableStudentAccess = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { studentId } = request.params as any;

    try {
        const est = await prisma.usuario.findUnique({
            where: { id: Number(studentId) }
        });

        if (!est) {
            return reply.code(404).send({ message: 'Estudiante no encontrado' });
        }

        // Validar que realmente tenga los requisitos (Opcional, pero recomendado por seguridad)
        const countCumplidos = await prisma.estudiantePrerequisito.count({
            where: { fkEstudiante: Number(studentId), cumplido: true }
        });

        const countTotales = await prisma.catalogoPrerequisito.count({
            where: { activo: true }
        });

        if (countCumplidos < countTotales) {
            return reply.code(400).send({
                message: `El estudiante no ha cumplido todos los requisitos (${countCumplidos}/${countTotales})`
            });
        }

        // 1. Enviar Correo
        await sendPlatformAccessEmail(
            est.correoInstitucional,
            `${est.nombres} ${est.apellidos}`
        );

        // 2. Crear Notificación en App
        await prisma.notificacion.create({
            data: {
                usuarioId: est.id,
                mensaje: '¡Felicidades! Se ha habilitado tu acceso a la plataforma de titulación.',
                leido: false
            }
        });

        // 3. (Opcional) Si tuvieras un campo accessGranted en Usuario, aquí lo actualizarías
        // await prisma.usuario.update({ where: { id: est.id }, data: { accessGranted: true } });

        return reply.code(200).send({ message: 'Acceso habilitado correctamente' });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error habilitando acceso al estudiante' });
    }
};