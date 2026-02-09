import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
    try {
        const counts = await prisma.usuario.groupBy({
            by: ['rol'],
            _count: { _all: true }
        });
        console.log("Roles distribution:", counts);

        const students = await prisma.usuario.findMany({
            where: { rol: 'ESTUDIANTE' },
            include: {
                estudiantePerfil: true,
                prerequisitos: true
            }
        });

        console.log(`Found ${students.length} students.`);
        if (students.length > 0) {
            console.log("Sample student:", JSON.stringify(students[0], null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

diagnose();
