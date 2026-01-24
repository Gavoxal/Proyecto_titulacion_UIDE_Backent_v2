import bcrypt from 'bcrypt';

export const getUsuarios = async (request, reply) => {
    const prisma = request.server.prisma;
    try {
        const usuarios = await prisma.usuario.findMany({
            select: {
                id: true,
                cedula: true,
                nombres: true,
                apellidos: true,
                correoInstitucional: true,
                rol: true,
                createdAt: true
            }
        });
        return usuarios;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error recuperando usuarios' });
    }
};

export const getUsuarioById = async (request, reply) => {
    const prisma = request.server.prisma;
    const { id } = request.params;
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

export const createUsuario = async (request, reply) => {
    const prisma = request.server.prisma;
    const { cedula, nombres, apellidos, correo, clave, rol } = request.body;

    try {
        const hashedPassword = await bcrypt.hash(clave, 10);
        const nuevoUsuario = await prisma.usuario.create({
            data: {
                cedula,
                nombres,
                apellidos,
                correoInstitucional: correo,
                clave: hashedPassword,
                rol: rol || 'ESTUDIANTE'
            }
        });
        return reply.code(201).send(nuevoUsuario);
    } catch (error) {
        request.log.error(error);
        if (error.code === 'P2002') {
            return reply.code(400).send({ message: 'Cédula o Correo ya registrado' });
        }
        return reply.code(500).send({ message: 'Error creando usuario' });
    }
};

export const updateUsuario = async (request, reply) => {
    const prisma = request.server.prisma;
    const { id } = request.params;
    const data = request.body;

    try {
        if (data.clave) {
            data.clave = await bcrypt.hash(data.clave, 10);
        }

        const usuarioActualizado = await prisma.usuario.update({
            where: { id: Number(id) },
            data: {
                ...data,
                updatedAt: new Date()
            }
        });
        return usuarioActualizado;
    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error actualizando usuario' });
    }
};

export const deleteUsuario = async (request, reply) => {
    const prisma = request.server.prisma;
    const { id } = request.params;

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
