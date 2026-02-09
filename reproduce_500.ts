import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function reproduce() {
    try {
        console.log("Starting reproduction...");
        const catalogo = await prisma.catalogoPrerequisito.findMany({
            where: { activo: true },
            orderBy: { orden: 'asc' }
        });
        console.log("Catalogo count:", catalogo.length);

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
        console.log("Estudiantes count:", estudiantes.length);
    } catch (e: any) {
        console.error("ERROR REPRODUCED:");
        console.error(e.message);
        if (e.stack) console.error(e.stack);
    } finally {
        await prisma.$disconnect();
    }
}

reproduce();
