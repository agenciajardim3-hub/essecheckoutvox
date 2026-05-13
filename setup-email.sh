#!/bin/bash

# Script de Setup - Email no Supabase
# Configura automaticamente as credenciais SMTP e faz deploy da função

echo "🚀 Iniciando setup do Email..."
echo ""

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Passo 1: Verificar se Supabase CLI está instalado
echo -e "${BLUE}📋 Verificando se Supabase CLI está instalado...${NC}"
if ! command -v supabase &> /dev/null
then
    echo -e "${RED}❌ Supabase CLI não está instalado!${NC}"
    echo "Instale com: npm install -g supabase"
    exit 1
fi
echo -e "${GREEN}✓ Supabase CLI encontrado${NC}"
echo ""

# Passo 2: Configurar SMTP Secrets
echo -e "${BLUE}🔐 Configurando credenciais SMTP...${NC}"
echo ""

echo "Configurando SMTP_HOST..."
supabase secrets set SMTP_HOST=smtp.hostinger.com
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SMTP_HOST configurado${NC}"
else
    echo -e "${RED}❌ Erro ao configurar SMTP_HOST${NC}"
    exit 1
fi

echo ""
echo "Configurando SMTP_PORT..."
supabase secrets set SMTP_PORT=587
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SMTP_PORT configurado${NC}"
else
    echo -e "${RED}❌ Erro ao configurar SMTP_PORT${NC}"
    exit 1
fi

echo ""
echo "Configurando SMTP_USER..."
supabase secrets set SMTP_USER=vox@voxmarketingacademy.com
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SMTP_USER configurado${NC}"
else
    echo -e "${RED}❌ Erro ao configurar SMTP_USER${NC}"
    exit 1
fi

echo ""
echo "Configurando SMTP_PASSWORD..."
supabase secrets set SMTP_PASSWORD='@Rodrigo94'
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SMTP_PASSWORD configurado${NC}"
else
    echo -e "${RED}❌ Erro ao configurar SMTP_PASSWORD${NC}"
    exit 1
fi

echo ""
echo "Configurando SMTP_FROM_NAME..."
supabase secrets set SMTP_FROM_NAME="Vox Marketing Academy"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SMTP_FROM_NAME configurado${NC}"
else
    echo -e "${RED}❌ Erro ao configurar SMTP_FROM_NAME${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}⏳ Aguardando 2 segundos para as secrets serem propagadas...${NC}"
sleep 2
echo ""

# Passo 3: Deploy da função
echo -e "${BLUE}📤 Fazendo deploy da função send-email...${NC}"
supabase functions deploy send-email

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Função deployada com sucesso!${NC}"
else
    echo -e "${RED}❌ Erro ao fazer deploy da função${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ SETUP COMPLETO!${NC}"
echo ""
echo -e "${BLUE}📧 Agora você pode:${NC}"
echo "1. Abrir o dashboard do Vox Control"
echo "2. Ir para a aba 'Configuração'"
echo "3. Clicar em 'Envio de Email Personalizado'"
echo "4. Usar o formulário para enviar emails!"
echo ""
echo -e "${YELLOW}💡 Dica: Use 'Enviar Teste' primeiro para verificar se funciona${NC}"
