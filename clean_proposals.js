const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Cleaning up all proposals...');
        // Nivel 4 (Dependencias de Actividad/Propuesta profunda)
        await prisma.comentario.deleteMany({});
        await prisma.evidencia.deleteMany({});

        // Nivel 3 (Dependencias de Propuesta)
        await prisma.actividad.deleteMany({});
        await prisma.trabajoTitulacion.deleteMany({});
        await prisma.comite.deleteMany({});
        await prisma.entregableFinal.deleteMany({});
        await prisma.bitacoraReunion.deleteMany({});
        await prisma.votacionTutor.deleteMany({});

        // Delete proposals
        const deleted = await prisma.propuesta.deleteMany();
        console.log(`Deleted ${deleted.count} proposals.`);
    } catch (error) {
        console.error("Error cleaning proposals:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
