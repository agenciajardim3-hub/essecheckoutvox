# 🚀 Quick Start: Email Functionality

If you're seeing the error "Unexpected token '<', <!DOCTYPE..." when trying to send emails, follow these steps.

## The Problem

The `send-email` Edge Function hasn't been deployed to your Supabase project yet. The error occurs because the function endpoint returns an HTML error page instead of JSON.

## Quick Fix (5 minutes)

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```
(This opens a browser for authentication)

### 3. Set SMTP Secrets

You need email service credentials. If using Hostinger:

```bash
supabase secrets set SMTP_HOST=smtp.hostinger.com
supabase secrets set SMTP_PORT=587
supabase secrets set SMTP_USER=seu-email@seu-dominio.com
supabase secrets set SMTP_PASSWORD=sua-senha-no-hostinger
supabase secrets set SMTP_FROM_NAME="Vox Marketing Academy"
```

**Replace these values with your actual SMTP credentials.**

### 4. Deploy the Function
```bash
supabase functions deploy send-email
```

### 5. Test in the App

After deployment:
1. Open the Vox Control dashboard
2. Go to Configuration tab
3. Click "Envio de Email Personalizado"
4. Fill in the email details
5. Click "Enviar Teste" (sends to your test email)
6. If successful, you'll see: "Email de teste enviado para [email]"

## Where to Get SMTP Credentials

### Hostinger (Most Common)
1. Log in to Hostinger
2. Go to Email → Your Email
3. Click the email address
4. In the left menu, find "SMTP Configuration"
5. You'll see:
   - **Server**: smtp.hostinger.com
   - **Port**: 587 (use this, not 465)
   - **Security**: TLS
   - **Username**: your-email@your-domain.com
   - **Password**: your email password

### Gmail
1. Enable "Less Secure App Access" in Google Account settings
2. Use these settings:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=seu-email@gmail.com
   SMTP_PASSWORD=sua-senha-de-app-google
   ```

### Other Email Providers
Check your email provider's SMTP documentation.

## Verify It Works

Test with curl:

```bash
PROJECT_ID="emdsgvuqrhpjdgrgaslo"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZHNndXFyaHBqZGdyZ2FzbG8iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc2Nzk2NzIxMiwiZXhwIjoyMDgzNTQzMjEyfQ.Emfi9OyHn9SrrY4AugAVGzLSm2YkBzAKwsZ1XGQ5DD0"

curl -X POST https://${PROJECT_ID}.supabase.co/functions/v1/send-email \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -d '{
    "email": "seu-email@gmail.com",
    "name": "Teste",
    "subject": "Email de Teste",
    "body": "Se você vê isso, a função funciona!"
  }'
```

**Expected response**:
```json
{
  "success": true,
  "message": "Email enviado com sucesso!",
  "timestamp": "2026-05-13T10:30:00.000Z"
}
```

## Common Issues

### "<!DOCTYPE html>" Error
- Function not deployed
- **Fix**: Run `supabase functions deploy send-email` again

### "SMTP credentials not configured"
- Secrets not set
- **Fix**: Set all SMTP secrets (see step 3 above)

### "SMTP connection/send error"
- Wrong credentials
- **Fix**: Verify credentials in your email provider's SMTP settings

### "Email inválido"
- Invalid email format
- **Fix**: Use a valid email address (user@domain.com)

## Need More Help?

See full documentation in `EDGE_FUNCTIONS_SETUP.md`

---

**Pro Tip**: After first deployment, you can update secrets and just redeploy:
```bash
supabase functions deploy send-email
```

That's it! Now the CustomEmailSender component will work properly.
