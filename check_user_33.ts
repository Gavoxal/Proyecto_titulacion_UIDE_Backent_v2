import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.usuario.findUnique({
        where: { id: 33 },
        include: { estudiantePerfil: true }
    });
    console.log('--- USER DATA ---');
    console.log(JSON.stringify(user, null, 2));

    const allProfiles = await prisma.estudiantePerfil.findMany();
    console.log('--- ALL PROFILES ---');
    console.log(JSON.stringify(allProfiles, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
