import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { env } from '../config/env';

const sha256 = (val?: string) => {
    if (!val) return null;
    const clean = val.trim().toLowerCase();
    return crypto.createHash('sha256').update(clean).digest('hex');
};

const hashPhone = (val?: string) => {
    if (!val) return null;
    const digits = val.replace(/\D/g, '');
    return crypto.createHash('sha256').update(digits).digest('hex');
};

export async function trackingRoutes(fastify: FastifyInstance) {
    /**
     * POST /api/v1/tracking/meta-capi
     * Envia eventos server-side para a Conversions API do Meta (Graph API v19+)
     */
    fastify.post('/meta-capi', async (request: FastifyRequest, reply: FastifyReply) => {
        const body: any = request.body || {};
        const {
            event_name = 'Purchase',
            event_time = Math.floor(Date.now() / 1000),
            event_id,
            event_source_url,
            user_data = {},
            custom_data = {},
            test_event_code
        } = body;

        const pixelId = body.pixel_id || env.META_PIXEL_ID;
        const accessToken = env.META_CAPI_TOKEN;

        if (!pixelId || !accessToken) {
            return reply.status(400).send({
                success: false,
                error: 'META_PIXEL_ID ou META_CAPI_TOKEN não configurados no servidor.',
            });
        }

        const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || request.ip;
        const clientUserAgent = request.headers['user-agent'] || '';

        const hashedUserData: any = {
            client_ip_address: clientIp,
            client_user_agent: clientUserAgent,
        };

        if (user_data.email) hashedUserData.em = [sha256(user_data.email)];
        if (user_data.phone) hashedUserData.ph = [hashPhone(user_data.phone)];
        if (user_data.fbp) hashedUserData.fbp = user_data.fbp;
        if (user_data.fbc) hashedUserData.fbc = user_data.fbc;

        const payload: any = {
            data: [
                {
                    event_name,
                    event_time,
                    event_id,
                    event_source_url: event_source_url || 'https://checkout.voxcontrol.com',
                    action_source: 'website',
                    user_data: hashedUserData,
                    custom_data: {
                        currency: custom_data.currency || 'BRL',
                        value: custom_data.value || 0,
                        ...custom_data,
                    },
                },
            ],
        };

        if (test_event_code) payload.test_event_code = test_event_code;

        try {
            const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const fbData: any = await fbRes.json();

            if (!fbRes.ok) {
                return reply.status(fbRes.status).send({ success: false, error: fbData });
            }

            return reply.send({
                success: true,
                events_received: fbData.events_received,
                fbtrace_id: fbData.fbtrace_id,
            });
        } catch (err: any) {
            return reply.status(500).send({ success: false, error: err?.message || 'Erro ao disparar Meta CAPI' });
        }
    });
}
