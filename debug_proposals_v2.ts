import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Checking proposals (v2)...');
    try {
        const proposals = await prisma.propuesta.findMany({
            include: {
                estudiante: {
                    select: {
                        id: true,
                        nombres: true,
                        apellidos: true,
                        cedula: true,
                        rol: true
                    }
                }
            }
        });

        console.log(`Found ${proposals.length} proposals.`);
        console.log(JSON.stringify(proposals, null, 2));
    } catch (e) {
        console.error("Error fetching proposals:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
