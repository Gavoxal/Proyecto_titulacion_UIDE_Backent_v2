
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const newAreas = [
    { codigo: 'DATA-IA', nombre: 'Ciencia de Datos e Inteligencia Artificial', descripcion: 'Ciencia de datos, IA y Machine Learning' },
    { codigo: 'GESTION-DIGITAL', nombre: 'Gestión de la Información y Transformación Digital', descripcion: 'Gestión de TI y transformación digital' },
    { codigo: 'INFRA-SEC', nombre: 'Infraestructura TI y Ciberseguridad', descripcion: 'Redes, infraestructura y seguridad informática' },
    { codigo: 'INNOV-ETICA', nombre: 'Innovación, Emprendimiento y Ética Tecnológica', descripcion: 'Innovación tecnológica y ética' },
    { codigo: 'DEV-SOFT', nombre: 'Programación y Desarrollo de Software', descripcion: 'Desarrollo de software y aplicaciones' },
];

async function main() {
    console.log('🔄 Updating Knowledge Areas...');

    try {
        // 1. Check if we can clean up old ones (only if no proposals use them)
        const proposalsCount = await prisma.propuesta.count();

        if (proposalsCount === 0) {
            console.log('🗑️ No proposals found. Cleaning up old areas...');
            await prisma.areaConocimiento.deleteMany({});
        } else {
            console.log(`⚠️ Found ${proposalsCount} proposals. Skipping deletion of old areas to prevent data loss.`);
            console.log('ℹ️ New areas will be added alongside existing ones.');
        }

        // 2. Insert new areas
        for (const area of newAreas) {
            const exists = await prisma.areaConocimiento.findFirst({
                where: { nombre: area.nombre }
            });

            if (!exists) {
                await prisma.areaConocimiento.create({
                    data: area
                });
                console.log(`✅ Created: ${area.nombre}`);
            } else {
                console.log(`info: Area already exists: ${area.nombre}`);
            }
        }

    } catch (e) {
        console.error('❌ Error updating areas:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
