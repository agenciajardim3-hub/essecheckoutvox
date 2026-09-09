# Como publicar o site

O site é estático: o navegador do cliente baixa `index.html` e os arquivos de
`assets/`. Não existe servidor de aplicação. Isso significa que publicar é copiar
arquivos, e voltar atrás é copiar de volta.

O banco (Supabase), as Edge Functions e os pagamentos **não são tocados** por
esta publicação. Se algo der errado aqui, o pior caso é a página não carregar —
nenhum dado se perde.

---

## Antes de publicar

Confira que o build é o atual:

```bash
npm ci
npm run build
```

Os arquivos ficam em `dist/`. Os nomes dentro de `assets/` levam um código
(`index-FB_J1tmg.js`), que muda a cada build. Isso é o que torna a publicação
segura: os arquivos novos **nunca sobrescrevem os antigos**.

---

## Publicando na Hostinger (manual)

### 1. Guarde o `index.html` atual

No Gerenciador de Arquivos, dentro de `public_html`, baixe o `index.html` para o
seu computador. Esse arquivo sozinho é o rollback completo.

### 2. Suba os arquivos novos de `assets/`

Envie o conteúdo de `dist/assets/` para dentro da pasta `assets/` que já existe.
**Não apague nada.** Os arquivos antigos ficam.

Por que não apagar: se alguém estiver com o checkout aberto naquele momento, o
navegador dessa pessoa ainda vai pedir os arquivos antigos. Apagá-los quebra a
compra no meio do caminho.

### 3. Suba o `index.html`

Por último. É ele que aponta para os arquivos novos — enquanto não for
substituído, o site continua servindo a versão anterior inteira.

A troca acontece neste passo, e leva o tempo de um upload.

### 4. Confira

Abra o site numa aba anônima (o navegador normal guarda cache). Verifique:

- [ ] A página do checkout carrega
- [ ] Nome, preço e imagem do produto aparecem
- [ ] O formulário abre e aceita digitação
- [ ] O cupom, se você usa, aplica o desconto
- [ ] Chega até a tela do Mercado Pago (não precisa pagar)

### Rollback

Suba de volta o `index.html` que você guardou no passo 1. Os arquivos antigos de
`assets/` nunca saíram do lugar, então o site volta inteiro ao estado anterior.

---

## Testando antes, sem tocar no site (recomendado)

O build usa caminhos relativos (`base: './'` no `vite.config.ts`), então funciona
de dentro de qualquer pasta.

1. Crie `public_html/teste/`
2. Suba `dist/` inteiro para lá
3. Abra `seudominio.com/teste/?checkout=SLUG` com o slug de um checkout real
4. Faça o passo 4 acima nessa URL

O site em produção segue intacto o tempo todo. Se algo estiver errado, você
descobre sem afetar ninguém — é só apagar a pasta `teste`.

---

## Publicando pelo GitHub Actions

Existe o workflow **Deploy site (Hostinger)** (`.github/workflows/deploy-hostinger.yml`).

Configuração, uma única vez, em *Settings > Secrets and variables > Actions*:

| Secret | Onde achar |
|---|---|
| `FTP_SERVER` | hPanel da Hostinger, em Arquivos > Contas FTP |
| `FTP_USERNAME` | mesma tela |
| `FTP_PASSWORD` | mesma tela |
| `FTP_DIR` | opcional; padrão `/public_html/` |

Depois: aba **Actions** > **Deploy site (Hostinger)** > **Run workflow**.

Ele compila e envia. `dangerous-clean-slate` fica desligado, então o envio só
adiciona e atualiza — `.htaccess`, uploads e arquivos fora do build continuam
onde estão. E roda só por acionamento manual: nenhum push publica sozinho.

---

## Quando publicar

Em horário de pouco movimento. Se algum evento estiver vendendo forte, espere.
Não existe pressa: o que já está no ar continua funcionando.
