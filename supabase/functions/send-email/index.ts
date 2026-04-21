import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const smtpHost = Deno.env.get('SMTP_HOST') || ''
const smtpPort = Deno.env.get('SMTP_PORT') || '587'
const smtpUser = Deno.env.get('SMTP_USER') || ''
const smtpPass = Deno.env.get('SMTP_PASS') || ''
const smtpFrom = Deno.env.get('SMTP_FROM') || 'CheckoutVox <noreply@example.com>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, body, isHtml = true } = await req.json()

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If SMTP is not configured, use Resend (recommended)
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: smtpFrom,
          to: [to],
          subject: subject,
          html: isHtml ? body : `<pre>${body}</pre>`,
        }),
      })

      if (!resendResponse.ok) {
        const error = await resendResponse.text()
        throw new Error(`Resend error: ${error}`)
      }

      const data = await resendResponse.json()
      return new Response(
        JSON.stringify({ success: true, id: data.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fallback: Log email (for development without SMTP)
    console.log('=== EMAIL LOG (SMTP not configured) ===')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log(`Body: ${body}`)
    console.log('=========================================')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email logged (SMTP not configured). Configure RESEND_API_KEY or SMTP credentials for real sending.',
        logged: { to, subject }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})