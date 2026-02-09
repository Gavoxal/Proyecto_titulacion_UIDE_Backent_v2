const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Checking for orphan proposals...');
        const proposals = await prisma.propuesta.findMany();
        console.log(`Total proposals: ${proposals.length}`);

        for (const p of proposals) {
            const student = await prisma.usuario.findUnique({
                where: { id: p.fkEstudiante }
            });
            if (!student) {
                console.log(`[ORPHAN] Proposal ID ${p.id} has fkEstudiante ${p.fkEstudiante} which does not exist in Usuario table.`);
            } else {
                console.log(`[VALID] Proposal ID ${p.id} belongs to ${student.nombres} ${student.apellidos} (ID: ${student.id})`);
            }
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
