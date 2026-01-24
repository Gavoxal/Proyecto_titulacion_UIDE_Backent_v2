import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('⏳ Intentando conectar a la base de datos...');
    try {
        await prisma.$connect();
        console.log('✅ ¡Conexión establecida correctamente!');

        // Intentar una consulta simple para verificar si las tablas existen
        try {
            const count = await prisma.usuario.count();
            console.log(`📊 Prueba de consulta exitosa. Usuarios encontrados: ${count}`);
        } catch (queryError) {
            if (queryError.code === 'P2021') {
                console.warn('⚠️ La conexión es exitosa, pero la tabla `usuarios` no existe.');
                console.warn('   Probablemente necesites ejecutar: npx prisma db push');
            } else {
                console.error('❌ Error realizando consulta:', queryError.message);
            }
        }

    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
