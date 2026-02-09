
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


import fs from 'fs';

// Helper to log to file
function logToFile(message: string) {
    fs.appendFileSync('diagnostic_output.txt', message + '\n');
    console.log(message);
}

async function main() {
    fs.writeFileSync('diagnostic_output.txt', ''); // Clear file
    logToFile("--- DIAGNOSTIC START ---");

    // 1. Search for Maria (Director)
    const director = await prisma.usuario.findFirst({
        where: {
            nombres: { contains: 'Maria' },
            apellidos: { contains: 'Gonz' }
        }
    });

    if (!director) {
        logToFile("User 'Maria' NOT FOUND in database.");
    } else {
        logToFile("Director User Found:");
        logToFile(`ID: ${director.id}`);
        logToFile(`Name: ${director.nombres} ${director.apellidos}`);
        logToFile(`Role: '${director.rol}'`);
    }

    // 2. Check what the Dashboard Query sees
    const dashboardUsers = await prisma.usuario.findMany({
        where: { rol: 'ESTUDIANTE' },
        select: { id: true, rol: true, nombres: true }
    });

    logToFile(`Dashboard Query (rol='ESTUDIANTE') found ${dashboardUsers.length} users.`);
    // const gabrielInDashboard = dashboardUsers.find(u => u.id === gabriel?.id);
    // logToFile(`Is Gabriel (ID ${gabriel?.id}) in Dashboard Query? ${!!gabrielInDashboard}`);

    logToFile("--- DIAGNOSTIC END ---");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
