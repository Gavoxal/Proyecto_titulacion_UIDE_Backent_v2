import bcrypt from 'bcrypt';

export const login = async (request, reply) => {
    const { correo, clave } = request.body;
    const prisma = request.server.prisma;

    try {
        // 1. Buscar usuario
        const usuario = await prisma.usuario.findUnique({
            where: { correoInstitucional: correo }
        });

        if (!usuario) {
            return reply.code(401).send({ message: 'Credenciales inválidas' });
        }

        // 2. Verificar password
        const valid = await bcrypt.compare(clave, usuario.clave);
        if (!valid) {
            return reply.code(401).send({ message: 'Credenciales inválidas' });
        }

        // 3. Generar token
        const token = request.server.jwt.sign({
            id: usuario.id,
            rol: usuario.rol,
            nombre: `${usuario.nombres} ${usuario.apellidos}`
        });

        return { token, usuario: { id: usuario.id, nombre: usuario.nombres, rol: usuario.rol } };

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({ message: 'Error interno del servidor' });
    }
};
