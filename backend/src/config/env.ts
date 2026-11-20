import dotenv from 'dotenv';
dotenv.config();

export const env = {
    PORT: parseInt(process.env.PORT || '3333', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://vox_user:vox_password@postgres:5432/vox_control?sslmode=disable',

    // SMTP (Hostinger / Custom)
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.hostinger.com',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '465', 10),
    SMTP_SECURE: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASSWORD: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '',
    SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'Vox Marketing Academy',
    EMAIL_FROM: process.env.EMAIL_FROM || process.env.SMTP_USER || 'contato@voxacademy.com.br',

    // Modo de Homologação / Teste de Email
    // Quando preenchido, todo e-mail é redirecionado exclusivamente para este destino com [TESTE] no assunto
    EMAIL_TEST_REDIRECT: process.env.EMAIL_TEST_REDIRECT || '',

    // Mercado Pago
    MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN || '',
    MP_WEBHOOK_SECRET: process.env.MP_WEBHOOK_SECRET || '',

    // Meta Conversions API
    META_PIXEL_ID: process.env.META_PIXEL_ID || '',
    META_CAPI_TOKEN: process.env.META_CAPI_TOKEN || '',
    META_TEST_EVENT_CODE: process.env.META_TEST_EVENT_CODE || '',
    META_API_VERSION: process.env.META_API_VERSION || 'v21.0',

    // Autenticação de Agentes (OpenClaw, Hermes, n8n)
    AGENT_API_KEY: process.env.AGENT_API_KEY || 'vox_agent_secret_key_change_in_production',

    // Webhooks Outbound (n8n Hub)
    N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || '',

    // Frontend URL
    FRONTEND_URL: process.env.FRONTEND_URL || 'https://checkout.voxcontrol.com',
};
