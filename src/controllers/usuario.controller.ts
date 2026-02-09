import bcrypt from 'bcrypt';
import { FastifyReply, FastifyRequest } from 'fastify';
import { sendCredentialsEmail } from '../services/email.service';
import * as fs from 'fs';
import * as path from 'path';


export const getUsuarios = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { rol } = request.query as { rol?: string };

    try {
        const where: any = {};
        if (rol) {
            where.rol = rol;
        }

        const usuarios = await prisma.usuario.findMany({
            where,
            orderBy: {
                apellidos: 'asc'
            },
            select: {
                id: true,
                cedula: true,
                nombres: true,
                apellidos: true,
                correoInstitucional: true,
                rol: true,
                // @ts-ignore
                designacion: true,
                createdAt: true,
                estudiantePerfil: true
            }
        });
        return usuarios;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error recuperando usuarios' });
    }
};

export const getUsuarioById = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: Number(id) },
            select: {
                id: true,
                cedula: true,
                nombres: true,
                apellidos: true,
                correoInstitucional: true,
                rol: true,
                // @ts-ignore
                designacion: true,
                createdAt: true
            }
        });
        if (!usuario) {
            return reply.code(404).send({ message: 'Usuario no encontrado' });
        }
        return usuario;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error recuperando usuario' });
    }
};

export const createUsuario = async (request: FastifyRequest, reply: FastifyReply) => {
    // @ts-ignore
    const prisma = request.server.prisma;
    const { cedula, nombres, apellidos, correo, clave, rol, designacion } = request.body as any;

    try {
        const hashedPassword = await bcrypt.hash(clave, 10);

        const result = await prisma.$transaction(async (tx) => {
            const nuevoUsuario = await tx.usuario.create({
                data: {
                    cedula,
                    nombres,
                    apellidos,
                    correoInstitucional: correo,
                    rol: rol || 'ESTUDIANTE',
                    // @ts-ignore
                    designacion
                }
            });

            await tx.auth.create({
                data: {
                    username: correo,
                    password: hashedPassword,
                    usuarioId: nuevoUsuario.id
                }
            });

            return nuevoUsuario;
        });

        // Enviar correo de credenciales (sin esperar a que bloquee la respuesta)
        sendCredentialsEmail(correo, `${nombres} ${apellidos}`, clave).catch((err: any) => {
            request.log.error(`Error enviando correo a ${correo}: ${err.message}`);
        });

        return reply.code(201).send(result);
    } catch (error) {
        request.log.error(error);
        if ((error as any).code === 'P2002') {
            const target = (error as any).meta?.target || '';
            if (target.includes('correo')) {
                return reply.code(400).send({ message: 'El Correo Institucional ya está registrado.' });
            }
            if (target.includes('cedula')) {
                return reply.code(400).send({ message: 'La Cédula ya está registrada.' });
            }
            return reply.code(400).send({ message: 'Cédula o Correo ya registrado.' });
        }
        return reply.code(500).send({ message: 'Error creando usuario' });
    }
};

export const updateUsuario = async (request: FastifyRequest, reply: FastifyReply) => {
    // @ts-ignore
    const prisma = request.server.prisma;
    const { id } = request.params as any;
    const data = request.body as any;

    try {
        // Separar clave del resto de datos
        const { clave, ...usuarioData } = data;

        await prisma.$transaction(async (tx) => {
            // Actualizar usuario
            await tx.usuario.update({
                where: { id: Number(id) },
                data: {
                    ...usuarioData,
                    updatedAt: new Date()
                }
            });

            // Si hay clave, actualizar Auth
            if (clave) {
                const hashedPassword = await bcrypt.hash(clave, 10);
                await tx.auth.update({
                    where: { usuarioId: Number(id) },
                    data: { password: hashedPassword }
                });
            }
        });

        const usuarioActualizado = await prisma.usuario.findUnique({ where: { id: Number(id) } });
        return usuarioActualizado;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error actualizando usuario' });
    }
};

export const deleteUsuario = async (request: FastifyRequest, reply: FastifyReply) => {
    const prisma = request.server.prisma;
    const { id } = request.params as any;

    try {
        await prisma.usuario.delete({
            where: { id: Number(id) }
        });
        return reply.code(204).send();
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error eliminando usuario' });
    }
};

/**
 * Carga masiva de usuarios
 * POST /api/v1/usuarios/bulk
 */

// Helper para generar contraseña aleatoria
function generateRandomPassword(length = 10) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let password = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        password += charset.charAt(Math.floor(Math.random() * n));
    }
    return password;
}

export const bulkCreateUsuarios = async (request: FastifyRequest, reply: FastifyReply) => {
    // @ts-ignore
    const prisma = request.server.prisma;
    const { usuarios } = request.body as { usuarios: any[] };

    if (!usuarios || !Array.isArray(usuarios)) {
        return reply.code(400).send({ message: 'Formato inválido. Se espera un array "usuarios".' });
    }

    console.log('📦 Bulk Upload Recibido. Cantidad:', usuarios.length);

    const resultados = {
        exitosos: [] as any[],
        omitidos: [] as any[], // Duplicados
        fallidos: [] as any[],
        total: usuarios.length,
        detalles: {
            exitosos: [] as any[],
            omitidos: [] as any[],
            fallidos: [] as any[]
        }
    };

    try {
        for (const usuarioData of usuarios) {
            try {
                const { cedula, nombres, apellidos, correo, rol, perfil } = usuarioData;

                // Validar campos requeridos
                if (!cedula || !nombres || !apellidos || !correo) {
                    console.log(`[BULK] Faltan campos para Cédula: ${cedula}, Correo: ${correo}`);
                    resultados.fallidos.push(cedula || 'desconocido');
                    resultados.detalles.fallidos.push({
                        cedula: cedula || 'desconocido',
                        error: 'Campos requeridos faltantes'
                    });
                    continue;
                }

                console.log(`[BULK] Procesando: ${cedula} - ${correo}`);

                // Verificar si ya existe
                const existente = await prisma.usuario.findFirst({
                    where: {
                        OR: [
                            { cedula: String(cedula) }, // Ensure string
                            { correoInstitucional: String(correo) }
                        ]
                    }
                });

                if (existente) {
                    console.log(`[BULK] USUARIO EXISTE (ID: ${existente.id}). Omitiendo...`);
                    resultados.omitidos.push(cedula);
                    resultados.detalles.omitidos.push({
                        cedula,
                        nombre: `${nombres} ${apellidos}`,
                        motivo: 'Ya registrado'
                    });
                    continue;
                } else {
                    console.log(`[BULK] Usuario NO encontrado. Creando...`);
                }

                // Generar contraseña aleatoria si no viene (o forzarla siempre)
                const rawPassword = generateRandomPassword();
                const hashedPassword = await bcrypt.hash(rawPassword, 10);

                // Preparar datos de creación
                const createData: any = {
                    cedula: String(cedula),
                    nombres,
                    apellidos,
                    correoInstitucional: correo,
                    rol: rol || 'ESTUDIANTE',
                    auth: {
                        create: {
                            username: correo, // Usar correo como username
                            password: hashedPassword
                        }
                    }
                };

                // Si es estudiante y tiene perfil, agregar relación
                if ((!rol || rol === 'ESTUDIANTE') && perfil) {
                    createData.estudiantePerfil = {
                        create: {
                            sexo: perfil.sexo,
                            estadoEscuela: perfil.estadoEscuela,
                            sede: perfil.sede,
                            escuela: perfil.escuela,
                            codigoMalla: perfil.codigoMalla,
                            malla: perfil.malla,
                            periodoLectivo: perfil.periodoLectivo,
                            ciudad: perfil.ciudad,
                            provincia: perfil.provincia,
                            pais: perfil.pais
                        }
                    };
                }

                const nuevoUsuario = await prisma.usuario.create({
                    data: createData,
                    select: {
                        id: true,
                        cedula: true,
                        nombres: true,
                        apellidos: true,
                        correoInstitucional: true,
                        rol: true
                    }
                });

                console.log(`[BULK] Usuario Creado: ${nuevoUsuario.id}`);
                resultados.exitosos.push(cedula);
                resultados.detalles.exitosos.push(nuevoUsuario);

                // Enviar correo con la contraseña generada
                try {
                    console.log(`[BULK] Enviando correo a ${correo}...`);
                    await sendCredentialsEmail(correo, `${nombres} ${apellidos}`, rawPassword);
                } catch (emailError) {
                    console.error(`Error enviando correo a ${correo}`, emailError);
                }

            } catch (error: any) {
                console.error(`[BULK] Error procesando ${usuarioData.cedula}:`, error);
                resultados.fallidos.push(usuarioData.cedula || 'desconocido');
                resultados.detalles.fallidos.push({
                    cedula: usuarioData.cedula || 'desconocido',
                    error: error.message || 'Error desconocido'
                });
            }
        }

        console.log(`✅ Carga finalizada: ${resultados.exitosos.length} creados, ${resultados.omitidos.length} omitidos, ${resultados.fallidos.length} fallidos`);
        return reply.code(200).send(resultados);

    } catch (error: any) {
        request.log.error(error);
        return reply.code(500).send({
            message: 'Error en carga masiva',
            error: error.message
        });
    }
};
