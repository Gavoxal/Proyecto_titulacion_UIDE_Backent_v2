import { FastifyReply, FastifyRequest } from 'fastify';

export const getMisEstudiantes = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const usuario = request.user as any; // From JWT

    try {
        // Obtenemos las propuestas donde el tutor está asignado en TrabajoTitulacion
        const propuestas = await prisma.propuesta.findMany({
            where: {
                trabajosTitulacion: {
                    some: {
                        fkTutorId: Number(usuario.id)
                    }
                }
            },
            include: {
                estudiante: {
                    select: {
                        id: true,
                        cedula: true,
                        nombres: true,
                        apellidos: true,
                        correoInstitucional: true,
                        estudiantePerfil: true
                    }
                },
                areaConocimiento: true,
                trabajosTitulacion: true // Para info extra si se requiere
            },
            orderBy: {
                fechaPublicacion: 'desc'
            }
        });

        // Transformamos para que el frontend vea una lista de "Estudiantes Asignados"
        // con su respectiva información de propuesta y actividad
        const estudiantesAsignados = await Promise.all(propuestas.map(async (p) => {
            // Buscamos info de actividades para este estudiante (vía propuesta)
            const actividades = await prisma.actividad.findMany({
                where: { propuestaId: p.id },
                include: {
                    evidencias: {
                        orderBy: { fechaEntrega: 'desc' },
                        take: 1
                    }
                }
            });

            // Contar evidencias totales
            const countEvidencias = await prisma.evidencia.count({
                where: { actividad: { propuestaId: p.id } }
            });

            const ultimaEvidencia = actividades
                .flatMap(a => a.evidencias)
                .sort((a, b) => b.fechaEntrega.getTime() - a.fechaEntrega.getTime())[0];

            // Calcular semana actual basado en fecha de asignación del trabajo de titulación
            // Buscamos el trabajo de titulación donde este tutor está asignado a este estudiante (via propuesta)
            const trabajoTitulacion = p.trabajosTitulacion.find(tt => tt.fkTutorId === Number(usuario.id));
            let semanaActual = 0;

            if (trabajoTitulacion?.fechaAsignacion) {
                const fechaInicio = new Date(trabajoTitulacion.fechaAsignacion);
                const fechaActual = new Date();
                const diffTime = Math.abs(fechaActual.getTime() - fechaInicio.getTime());
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                semanaActual = Math.floor(diffDays / 7) + 1;
            }

            return {
                id: p.estudiante.id,
                nombres: p.estudiante.nombres,
                apellidos: p.estudiante.apellidos,
                cedula: p.estudiante.cedula,
                correo: p.estudiante.correoInstitucional,
                perfil: p.estudiante.estudiantePerfil,
                propuesta: {
                    id: p.id,
                    titulo: p.titulo,
                    estado: p.estado,
                    area: p.areaConocimiento?.nombre,
                    fechaPublicacion: p.fechaPublicacion,
                    // Nuevos campos para revisión
                    descripcion: p.objetivos, // Mapeamos objetivos como descripción principal
                    problematica: p.problematica,
                    archivoUrl: p.archivoUrl,
                    comentarioRevision: p.comentarioRevision
                },
                actividadResumen: {
                    totalEvidencias: countEvidencias,
                    ultimaFecha: ultimaEvidencia?.fechaEntrega || p.fechaPublicacion,
                    ultimoContenido: ultimaEvidencia?.contenido || 'Sin entregas aún'
                },
                semanaActual: semanaActual,
                totalSemanas: 15 // Valor por defecto o configurable
            };
        }));

        return estudiantesAsignados;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error recuperando estudiantes asignados' });
    }
};

export const getTutorProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const usuario = request.user as any;

    try {
        const tutor = await prisma.usuario.findUnique({
            where: { id: Number(usuario.id) },
            include: {
                tutorPerfil: true
            }
        });

        if (!tutor) {
            return reply.code(404).send({ message: 'Tutor no encontrado' });
        }

        return tutor;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error obteniendo perfil del tutor' });
    }
};

export const updateTutorProfile = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const usuario = request.user as any;
    const { titulo, celular, sede, departamento, especialidad } = request.body as any;

    try {
        const updatedTutor = await prisma.usuario.update({
            where: { id: Number(usuario.id) },
            data: {
                tutorPerfil: {
                    upsert: {
                        create: {
                            titulo,
                            celular,
                            sede,
                            departamento,
                            especialidad
                        },
                        update: {
                            titulo,
                            celular,
                            sede,
                            departamento,
                            especialidad
                        }
                    }
                }
            },
            include: {
                tutorPerfil: true
            }
        });

        return updatedTutor;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error actualizando perfil del tutor' });
    }
};
