import Fastify from 'fastify';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import { PrismaClient } from '@prisma/client';

import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Fix for TypeScript type definition augmentation if needed
declare module 'fastify' {
    interface FastifyInstance {
        prisma: PrismaClient;
        authenticate: (request: any, reply: any) => Promise<void>;
    }
}

const app = Fastify({
    logger: true
});

// Initialize Prisma
const prisma = new PrismaClient();
app.decorate('prisma', prisma);

app.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
});

// Plugins
await app.register(cors);
await app.register(multipart, {
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    }
});

// Static Files
await app.register(fastifyStatic, {
    root: path.join(__dirname, '../uploads'),
    prefix: '/uploads/',
});

// Swagger
// Swagger
await app.register(fastifySwagger, {
    openapi: {
        info: {
            title: 'API Titulación',
            description: 'API REST para el Sistema de Gestión de Titulación',
            version: '1.0.0'
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        }
    }
});

await app.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
        docExpansion: 'full',
        deepLinking: false
    },
    uiHooks: {
        onRequest: function (request, reply, next) { next() },
        preHandler: function (request, reply, next) { next() }
    },
    staticCSP: true,
    transformStaticCSP: (header: string) => header
});


// Plugins
// @ts-ignore
await app.register((await import('./plugins/jwt.plugin.js')).default);

// Routes
// @ts-ignore
await app.register((await import('./routes/auth/auth.routes.js')).default, { prefix: '/api/v1/auth' });
// @ts-ignore
// @ts-ignore
await app.register((await import('./routes/usuarios/usuario.routes.js')).default, { prefix: '/api/v1/usuarios' });
// @ts-ignore
await app.register((await import('./routes/propuestas/propuesta.routes.js')).default, { prefix: '/api/v1/propuestas' });
// @ts-ignore
await app.register((await import('./routes/actividades/actividad.routes.js')).default, { prefix: '/api/v1/actividades' });
// @ts-ignore
await app.register((await import('./routes/comentarios/comentario.routes.js')).default, { prefix: '/api/v1/comentarios' });
// @ts-ignore
await app.register((await import('./routes/prerequisitos/prerequisito.routes.js')).default, { prefix: '/api/v1/prerequisitos' });
// @ts-ignore
await app.register((await import('./routes/entregables/entregable.routes.js')).default, { prefix: '/api/v1/entregables' });

// @ts-ignore
await app.register((await import('./routes/comite/comite.routes.js')).default, { prefix: '/api/v1/comite' });
// @ts-ignore
await app.register((await import('./routes/estudiantes/estudiante.routes.js')).default, { prefix: '/api/v1/estudiantes' });

// @ts-ignore
await app.register((await import('./routes/tutor/tutor.routes.js')).default, { prefix: '/api/v1/tutor' });
// @ts-ignore
await app.register((await import('./routes/areas/areaConocimiento.routes.js')).default, { prefix: '/api/v1/areas-conocimiento' });

// Nuevas rutas
// @ts-ignore
await app.register((await import('./routes/bitacora/bitacora.routes.js')).default, { prefix: '/api/v1/bitacora' });
// @ts-ignore
await app.register((await import('./routes/votacion/votacion.routes.js')).default, { prefix: '/api/v1/votacion' });
// @ts-ignore
await app.register((await import('./routes/defensas/defensa.routes.js')).default, { prefix: '/api/v1/defensas' });
// @ts-ignore
await app.register((await import('./routes/notificacion.routes.js')).default, { prefix: '/api/v1/notificaciones' });
// @ts-ignore
await app.register((await import('./routes/trabajos/trabajos.routes.js')).default, { prefix: '/api/v1/trabajos-titulacion' });
// @ts-ignore
await app.register((await import('./routes/dashboard/dashboard.routes.js')).default, { prefix: '/api/v1/dashboard' });











// Basic Route
app.get('/', async (request, reply) => {
    return { hello: 'world', message: 'API Titulación Running (TS)' };
});

// Run
const start = async () => {
    try {
        await app.listen({ port: 3000 });
        console.log('Server running at http://localhost:3000');
        console.log('Documentation at http://localhost:3000/documentation');
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();