const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Checking proposals...');
    try {
        const proposals = await prisma.propuesta.findMany({
            include: {
                estudiante: true
            }
        });

        console.log(`Found ${proposals.length} proposals.`);
        proposals.forEach(p => {
            console.log(`ID: ${p.id}, Title: ${p.titulo}, StudentID: ${p.fkEstudiante}, StudentLoaded: ${!!p.estudiante}`);
            if (p.estudiante) {
                console.log(`  Student Name: ${p.estudiante.nombres} ${p.estudiante.apellidos}`);
            } else {
                console.log(`  [WARNING] Student is null!`);
            }
        });
    } catch (error) {
        console.error("Error querying database:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
