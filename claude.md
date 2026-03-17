# CheckoutVox - Guia e Contexto para o Claude (claude.md)

Este documento centraliza as instruções, o contexto do projeto e as regras que o Claude deve seguir ao atuar no **CheckoutVox**.

## 1. Stack Tecnológica
- **Frontend**: React, TypeScript, Vite.
- **Integrações Chave**:
  - **Evolution API**: Integração para WhatsApp (mensagens, sincronização em tempo real via webhooks e Server-Sent Events - SSE).
  - **Capacitor**: Utilizado para empacotar o frontend web como um aplicativo móvel (Android APK).

## 2. Componentes Principais (Dashboard e Tickets)
- O projeto possui forte foco em painéis de controle e gestão de tickets/check-in.
- Componentes relevantes: `CheckInDashboard.tsx`, `FinancialDashboard.tsx`, `TicketScanner.tsx`, `TicketLogs.tsx`.

## 3. Diretrizes de Desenvolvimento
- **TypeScript Strict**: Evite o uso de `any`. Utilize interfaces precisas, como a interface `Lead` ou `EvolutionMessageKey` conforme desenvolvimentos recentes.
- **Responsividade e Mobile**: O layout deve se adequar perfeitamente a dispositivos móveis (Android), respeitando as "safe area insets" para evitar sobreposição com barras de sistema.
- **Sincronização**: O chat e os dados devem refletir alterações em tempo real (evitando duplicação de mensagens e problemas de formatação de horários).
- **Tratamento de Erros e Performance**: Certifique-se de que listas como o histórico de chat sejam carregadas de forma otimizada para manter a UI responsiva.

## 4. Ambiente de Desenvolvimento
- O projeto geralmente roda na porta `5173` ou `5174`.
- Comando padrão para rodar localmente: `npm run dev`

---
*Nota: Este arquivo pode ser atualizado a qualquer momento para refletir as novas decisões arquiteturais ou fluxos do projeto.*
