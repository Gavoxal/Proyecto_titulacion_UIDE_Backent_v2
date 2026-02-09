import { FastifyInstance } from 'fastify';
import {
    getMyNotificaciones,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    deleteNotificacion
} from '../controllers/notificacion.controller.js';

async function notificacionRoutes(fastify: FastifyInstance) {
    // Todas las rutas requieren autenticación
    fastify.get('/', { preHandler: [fastify.authenticate] }, getMyNotificaciones);
    fastify.get('/unread-count', { preHandler: [fastify.authenticate] }, getUnreadCount);
    fastify.patch('/:id/read', { preHandler: [fastify.authenticate] }, markAsRead);
    fastify.patch('/mark-all-read', { preHandler: [fastify.authenticate] }, markAllAsRead);
    fastify.delete('/:id', { preHandler: [fastify.authenticate] }, deleteNotificacion);
}

export default notificacionRoutes;
