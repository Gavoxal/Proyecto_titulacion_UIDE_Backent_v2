import Fastify from 'fastify';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = Fastify({
  logger: true
});

// Plugins
await app.register(cors);

// Swagger
await app.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'API Titulación',
      description: 'API REST para el Sistema de Gestión de Titulación',
      version: '1.0.0'
    },
    host: 'localhost:3000',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
    securityDefinitions: {
      apiKey: {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header'
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
  transformStaticCSP: (header) => header
});



const prisma = new PrismaClient();
app.decorate('prisma', prisma);

app.addHook('onClose', async (instance) => {
  await instance.prisma.$disconnect();
});


// Plugins
await app.register((await import('./plugins/jwt.js')).default);

// Routes
await app.register((await import('./routes/auth/index.js')).default, { prefix: '/api/v1/auth' });
await app.register((await import('./routes/usuarios/index.js')).default, { prefix: '/api/v1/usuarios' });




// Basic Route
app.get('/', async (request, reply) => {
  return { hello: 'world', message: 'API Titulación Running' };
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
