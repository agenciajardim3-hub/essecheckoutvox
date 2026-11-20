import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { pool } from './db/client';
import { paymentsRoutes } from './routes/payments';
import { trackingRoutes } from './routes/tracking';
import { messagingRoutes } from './routes/messaging';
import { ticketsRoutes } from './routes/tickets';
import { agentRoutes } from './routes/agent';
import { storageRoutes } from './routes/storage';
import { webhookDispatcher } from './services/webhookDispatcher';

const fastify = Fastify({
    logger: env.NODE_ENV !== 'production',
});

async function main() {
    await fastify.register(cors, {
        origin: true,
        credentials: true,
    });

    await fastify.register(sensible);
    await fastify.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const clientDist = path.resolve(process.cwd(), 'client_dist');
    const hasClientDist = fs.existsSync(clientDist);

    if (hasClientDist) {
        await fastify.register(fastifyStatic, {
            root: clientDist,
            prefix: '/',
            decorateReply: true,
            setHeaders: (res, pathName) => {
                if (pathName.includes('/assets/')) {
                    // Cache imutável de 1 ano para bundles com hash do Vite
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                } else if (pathName.endsWith('.html') || pathName === '/' || pathName === '') {
                    // HTML sempre fresco para refletir deploys imediatamente
                    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
                }
            },
        });

        await fastify.register(fastifyStatic, {
            root: uploadsDir,
            prefix: '/uploads/',
            decorateReply: false,
        });

        fastify.setNotFoundHandler((req, reply) => {
            if (req.raw.url && req.raw.url.startsWith('/api/')) {
                reply.code(404).send({ error: 'Endpoint não encontrado', url: req.raw.url });
            } else {
                reply.sendFile('index.html');
            }
        });
    } else {
        await fastify.register(fastifyStatic, {
            root: uploadsDir,
            prefix: '/uploads/',
        });
    }

    // Health Check
    fastify.get('/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        env: env.NODE_ENV,
        emailTestMode: Boolean(env.EMAIL_TEST_REDIRECT),
    }));

    // Registro das rotas
    await fastify.register(paymentsRoutes, { prefix: '/api/v1/payments' });
    await fastify.register(trackingRoutes, { prefix: '/api/v1/tracking' });
    await fastify.register(messagingRoutes, { prefix: '/api/v1/messaging' });
    await fastify.register(ticketsRoutes, { prefix: '/api/v1/tickets' });
    await fastify.register(agentRoutes, { prefix: '/api/v1/agent' });
    await fastify.register(storageRoutes, { prefix: '/api/v1/storage' });

    // Inicia o worker de retry de webhooks
    webhookDispatcher.startRetryWorker();

    try {
        await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
        console.log(`[Fastify] 🚀 Servidor Vox Control rodando na porta ${env.PORT}`);
        if (env.EMAIL_TEST_REDIRECT) {
            console.log(`[Fastify] ⚠️ EMAIL_TEST_REDIRECT ativo: Todos os e-mails serão redirecionados para: ${env.EMAIL_TEST_REDIRECT}`);
        }
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

// Graceful shutdown
const shutdown = async () => {
    console.log('[Fastify] Encerrando servidor e conexões com o banco...');
    await fastify.close();
    await pool.end();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

void main();
