# 📧 Edge Functions Setup Guide

This guide explains how to deploy and configure the Supabase Edge Functions used in this project.

## Available Edge Functions

### 1. `send-email` - Envio de Emails via SMTP

**Location**: `supabase/functions/send-email/index.ts`

**Purpose**: Send personalized emails via SMTP (used by CustomEmailSender component)

**Requirements**:
- SMTP server credentials (host, port, user, password)
- Supabase CLI installed locally
- Access to your Supabase project

## Prerequisites

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Authenticate with Supabase**:
   ```bash
   supabase login
   ```

3. **Get Your Project ID**:
   - Go to https://supabase.com/dashboard
   - Navigate to your project settings
   - Copy the Project ID

## Deployment Steps

### Step 1: Set SMTP Secrets

The `send-email` function requires SMTP credentials stored as Supabase Secrets.

**Option A: Using Supabase Dashboard**

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings → Secrets**
4. Add the following secrets:

| Secret Name | Value | Example |
|------------|-------|---------|
| `SMTP_HOST` | Your SMTP server hostname | `smtp.hostinger.com` |
| `SMTP_PORT` | SMTP port (usually 587 for TLS) | `587` |
| `SMTP_USER` | Your email address | `noreply@seu-dominio.com` |
| `SMTP_PASSWORD` | Your SMTP password | `sua-senha-segura` |
| `SMTP_FROM_NAME` | Sender name | `Vox Marketing Academy` |

**Option B: Using Supabase CLI**

```bash
supabase secrets set SMTP_HOST=smtp.hostinger.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=noreply@seu-dominio.com
supabase secrets set SMTP_PASSWORD=sua-senha-segura
supabase secrets set SMTP_FROM_NAME="Vox Marketing Academy"
```

### Step 2: Deploy the Function

Navigate to the project root and deploy:

```bash
supabase functions deploy send-email
```

**Expected Output**:
```
Deployed send-email to https://[PROJECT-ID].supabase.co/functions/v1/send-email
```

### Step 3: Verify Deployment

Test the function with a curl request:

```bash
curl -X POST https://[PROJECT-ID].supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [ANON-KEY]" \
  -d '{
    "email": "seu-email@gmail.com",
    "name": "Teste",
    "subject": "Email de Teste",
    "body": "Este é um email de teste do Vox Control"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Email enviado com sucesso!",
  "timestamp": "2026-05-13T10:30:00.000Z"
}
```

## Troubleshooting

### Error: "<!DOCTYPE html>" (HTML Response)

**Cause**: Function not deployed or endpoint not accessible

**Solution**:
1. Verify function is deployed: `supabase functions list`
2. Check function logs: `supabase functions logs send-email`
3. Redeploy: `supabase functions deploy send-email`

### Error: "SMTP credentials not configured"

**Cause**: Missing environment secrets

**Solution**:
1. Verify all SMTP secrets are set: `supabase secrets list`
2. Confirm secret values are correct
3. Redeploy function: `supabase functions deploy send-email`

### Error: "SMTP connection/send error"

**Cause**: Invalid SMTP credentials or server issues

**Solution**:
1. Verify SMTP credentials with your email provider
2. Check SMTP host and port are correct
3. Ensure sender email is authenticated with the SMTP server
4. Check Supabase function logs: `supabase functions logs send-email`

### Error: "Email inválido" (Invalid Email)

**Cause**: Email format validation failed

**Solution**: Ensure recipient email has valid format (user@domain.com)

## Using in Components

Once deployed, the function is automatically available to components that call it:

```tsx
// CustomEmailSender.tsx uses this pattern:
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      email: recipientEmail,
      name: name,
      subject: subject,
      body: bodyContent,
      type: 'custom'
    })
  }
);
```

## Optional Parameters

The `send-email` function supports optional parameters for rich emails:

| Parameter | Type | Purpose |
|-----------|------|---------|
| `certificateUrl` | string | Link to certificate (shows "Ver Certificado" button) |
| `ticketUrl` | string | Link to event ticket (shows "Ver Ingresso" button) |
| `imageUrl` | string | Image to include in email body |
| `type` | string | Email type for logging (e.g., 'certificate', 'ticket', 'custom') |

### Example with Optional Parameters:

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      email: 'student@example.com',
      name: 'João Silva',
      subject: 'Seu Certificado Está Pronto!',
      body: 'Parabéns por completar o curso!',
      certificateUrl: 'https://example.com/certificates/12345',
      ticketUrl: 'https://example.com/tickets/abc123',
      imageUrl: 'https://example.com/images/course-completion.png',
      type: 'certificate'
    })
  }
);
```

## Environment Variables

Add these to your `.env.local` file (use `.env.example` as a template):

```env
VITE_SUPABASE_URL=https://emdsgvuqrhpjdgrgaslo.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_TEST_EMAIL=seu-email-teste@gmail.com
```

## More Information

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno SMTP Client](https://deno.land/x/smtp@v0.7.0)
- [Managing Secrets](https://supabase.com/docs/guides/functions/secrets)

---

**Last Updated**: 2026-05-13  
**Status**: Production Ready
