import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { env } from '../config/env';

const sha256 = (val?: string) => {
    if (!val) return null;
    const clean = val.trim().toLowerCase();
    return crypto.createHash('sha256').update(clean).digest('hex');
};

const stripAccents = (value: string): string =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeAlpha = (value?: string) => {
    if (!value) return null;
    const clean = stripAccents(value).trim().toLowerCase().replace(/[^a-z]/g, '');
    return clean ? sha256(clean) : null;
};

const normalizePhone = (val?: string) => {
    if (!val) return null;
    let digits = val.replace(/\D/g, '');
    if (!digits) return null;
    // Meta exige código do país: para números brasileiros com 10 ou 11 dígitos, adiciona 55
    if (digits.length >= 10 && digits.length <= 11) {
        digits = `55${digits}`;
    }
    return crypto.createHash('sha256').update(digits).digest('hex');
};

export interface MetaCapiPayload {
    pixelId?: string;
    eventName: string;
    eventId: string;
    eventTime?: number;
    eventSourceUrl?: string;
    actionSource?: string;
    useRequestClient?: boolean;
    clientIp?: string;
    clientUserAgent?: string;
    userData?: {
        email?: string;
        phone?: string;
        firstName?: string;
        lastName?: string;
        name?: string;
        city?: string;
        cpf?: string;
        externalId?: string;
        fbp?: string;
        fbc?: string;
        clientIpAddress?: string;
        clientUserAgent?: string;
    };
    customData?: Record<string, any>;
    testEventCode?: string;
}

/**
 * Função utilitária central para envio server-side de eventos para a Conversions API do Meta (v21.0).
 * Pode ser invocada via HTTP ou diretamente por rotas internas (ex: aprovação de pagamento no webhook MP).
 */
export async function sendMetaCapiServerEvent(params: MetaCapiPayload) {
    const pixelId = params.pixelId || env.META_PIXEL_ID;
    const accessToken = env.META_CAPI_TOKEN;

    if (!pixelId || !accessToken) {
        return {
            success: false,
            error: 'META_PIXEL_ID ou META_CAPI_TOKEN não configurados no servidor.',
        };
    }

    const rawUser = params.userData || {};
    let firstName = rawUser.firstName;
    let lastName = rawUser.lastName;

    if (!firstName && rawUser.name) {
        const parts = rawUser.name.trim().split(/\s+/);
        firstName = parts[0];
        lastName = parts.slice(1).join(' ');
    }

    const hashedUserData: Record<string, any> = {};

    const em = sha256(rawUser.email);
    if (em) hashedUserData.em = [em];

    const ph = normalizePhone(rawUser.phone);
    if (ph) hashedUserData.ph = [ph];

    const fn = normalizeAlpha(firstName);
    if (fn) hashedUserData.fn = [fn];

    const ln = normalizeAlpha(lastName);
    if (ln) hashedUserData.ln = [ln];

    const ct = normalizeAlpha(rawUser.city);
    if (ct) hashedUserData.ct = [ct];

    const extId = rawUser.externalId || rawUser.cpf;
    if (extId) {
        const cleanExtId = extId.replace(/\D/g, '') || extId.trim();
        const extHash = sha256(cleanExtId);
        if (extHash) hashedUserData.external_id = [extHash];
    }

    // fbp e fbc devem ser passados em texto puro
    if (rawUser.fbp) hashedUserData.fbp = rawUser.fbp;
    if (rawUser.fbc) hashedUserData.fbc = rawUser.fbc;

    // IP e User-Agent
    const ip = rawUser.clientIpAddress || params.clientIp;
    const ua = rawUser.clientUserAgent || params.clientUserAgent;
    if (ip) hashedUserData.client_ip_address = ip;
    if (ua) hashedUserData.client_user_agent = ua;

    const customData = params.customData || {};

    const eventPayload: any = {
        data: [
            {
                event_name: params.eventName || 'Purchase',
                event_time: params.eventTime || Math.floor(Date.now() / 1000),
                event_id: params.eventId,
                event_source_url: params.eventSourceUrl || env.FRONTEND_URL || 'https://checkout.voxcontrol.com',
                action_source: params.actionSource || 'website',
                user_data: hashedUserData,
                custom_data: {
                    currency: customData.currency || 'BRL',
                    value: Number(customData.value) || 0,
                    ...customData,
                },
            },
        ],
    };

    const testCode = params.testEventCode || env.META_TEST_EVENT_CODE;
    if (testCode) {
        eventPayload.test_event_code = testCode;
    }

    try {
        const apiVersion = env.META_API_VERSION || 'v21.0';
        const fbRes = await fetch(`https://graph.facebook.com/${apiVersion}/${pixelId}/events?access_token=${accessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(eventPayload),
        });

        const fbData: any = await fbRes.json();

        if (!fbRes.ok) {
            console.warn('[MetaCAPI] Erro retornado pela API do Meta:', fbData);
            return { success: false, status: fbRes.status, error: fbData };
        }

        return {
            success: true,
            events_received: fbData.events_received,
            fbtrace_id: fbData.fbtrace_id,
        };
    } catch (err: any) {
        console.error('[MetaCAPI] Exceção de rede ao chamar Meta:', err);
        return { success: false, error: err?.message || 'Erro ao disparar Meta CAPI' };
    }
}

export async function trackingRoutes(fastify: FastifyInstance) {
    /**
     * POST /api/v1/tracking/meta-capi
     * Envia eventos server-side para a Conversions API do Meta (Graph API v21+)
     * Suporta camelCase (padrão frontend/Edge Function) e snake_case (padrão Graph API).
     */
    fastify.post('/meta-capi', async (request: FastifyRequest, reply: FastifyReply) => {
        const body: any = request.body || {};

        const eventName = body.eventName || body.event_name || 'Purchase';
        const eventId = body.eventId || body.event_id;
        const pixelId = body.pixelId || body.pixel_id || env.META_PIXEL_ID;
        const eventTime = Number(body.eventTime || body.event_time) || Math.floor(Date.now() / 1000);
        const eventSourceUrl = body.eventSourceUrl || body.event_source_url || env.FRONTEND_URL || 'https://checkout.voxcontrol.com';
        const actionSource = body.actionSource || body.action_source || 'website';
        const useRequestClient = body.useRequestClient !== undefined ? body.useRequestClient : (body.use_request_client !== undefined ? body.use_request_client : true);
        const rawUserData = body.userData || body.user_data || {};
        const rawCustomData = body.customData || body.custom_data || {};
        const testEventCode = body.testEventCode || body.test_event_code || env.META_TEST_EVENT_CODE;

        if (!eventId) {
            return reply.status(400).send({
                success: false,
                error: 'eventId é obrigatório para deduplicação com o Meta Pixel.',
            });
        }

        const forwarded = (request.headers['x-forwarded-for'] as string) || '';
        const clientIp = useRequestClient ? (forwarded.split(',')[0]?.trim() || request.ip) : undefined;
        const clientUserAgent = useRequestClient ? (request.headers['user-agent'] || '') : undefined;

        const result = await sendMetaCapiServerEvent({
            pixelId,
            eventName,
            eventId,
            eventTime,
            eventSourceUrl,
            actionSource,
            useRequestClient,
            clientIp,
            clientUserAgent,
            userData: rawUserData,
            customData: rawCustomData,
            testEventCode,
        });

        if (!result.success) {
            const status = (result as any).status || 400;
            return reply.status(status).send(result);
        }

        return reply.send(result);
    });
}
