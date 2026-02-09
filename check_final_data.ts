import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- ESTRUCTURA DE DATOS REAL ---');
    const user = await prisma.usuario.findUnique({
        where: { id: 33 },
        include: {
            estudiantePerfil: true
        }
    });

    console.log(JSON.stringify(user, null, 2));
}

main().finally(() => prisma.$disconnect());
