# 🧪 Guia Completo: Como Testar QR Codes sem Celular

## 📋 Opções Disponíveis

### 1. **Página de Teste Integrada** ⭐ (RECOMENDADO)

Acesse: `http://localhost:5173/teste-qr`

**Como usar:**

1. Abra a página de teste no navegador
2. Abra uma nova aba/janela para o Validador
3. Use a câmera para escanear o QR code mostrado na primeira aba

### 2. **Gerador de QR Personalizado**

Na página de teste, você pode:

- Gerar QR codes com dados personalizados
- Testar diferentes tipos de ingresso
- Validar diferentes cenários

### 3. **Teste Manual com Código**

No Validador, digite diretamente:

- `test-ticket-123` (código de exemplo)
- Qualquer ticket ID gerado pelo sistema

## 🖥️ **Métodos Alternativos**

### **Opção A: Dois Navegadores**

1. Abra Chrome e Firefox (ou duas janelas)
2. Em um: página de teste com QR code
3. No outro: página do validador
4. Use a câmera para escanear entre as telas

### **Opção B: Dispositivos Múltiplos**

- Notebook + Tablet
- Computador + Smartphone
- Dois monitores

### **Opção C: Impressão**

1. Gere um QR code na página de teste
2. Clique com botão direito na imagem
3. "Salvar como" ou "Imprimir"
4. Use o papel impresso para teste

### **Opção D: Aplicativo de QR Online**

1. Copie os dados JSON do QR gerado
2. Cole em um gerador online (qr-code-generator.com)
3. Baixe a imagem
4. Use para teste

## 🔧 **Configurações de Câmera**

### **Chrome/Edge:**

- Clique no ícone de câmera na barra de endereço
- Permitir acesso à câmera para localhost

### **Firefox:**

- Configurações > Privacidade e Segurança
- Permissões > Câmera > Permitir para localhost

### **Safari:**

- Safari > Preferências > Sites
- Câmera > Permitir para localhost

## 📊 **Dados de Teste Disponíveis**

### **QR Code Padrão:**

```json
{
  "ticketId": "test-ticket-123",
  "qrCode": "qr-test-ticket-123",
  "eventId": "test-event-456",
  "timestamp": 1735210800000,
  "type": "INGRESSOSZ_TICKET"
}
```

### **Códigos para Teste Manual:**

- `test-ticket-123` - Ingresso válido
- `test-ticket-usado` - Ingresso já usado
- `abc123` - Código inválido (muito curto)

## 🎯 **Fluxo de Teste Completo**

1. **Preparação:**

   - Servidor rodando (`npm run dev`)
   - Usuário logado no sistema
   - Câmera funcionando

2. **Geração:**

   - Acesse `/teste-qr`
   - Gere ou use QR code padrão
   - Verifique se a imagem aparece

3. **Validação:**

   - Abra `/validador` em nova aba
   - Clique "Scan QR"
   - Permita acesso à câmera
   - Aponte para o QR code

4. **Verificação:**
   - Scanner deve detectar automaticamente
   - Sistema valida no Firebase
   - Resultado aparece na tela

## 🚨 **Troubleshooting**

### **Scanner não detecta:**

- Verifique iluminação
- Ajuste distância da tela
- Limpe lente da câmera
- Teste com QR code menor/maior

### **Câmera não liga:**

- Verifique permissões do navegador
- Teste em modo privado/incógnito
- Reinicie o navegador
- Use HTTPS se necessário

### **Validação falha:**

- Verifique conexão com Firebase
- Confirme dados do ingresso
- Teste com código manual primeiro

## 🔗 **Links Úteis**

- Página Principal: http://localhost:5173/
- Teste de QR: http://localhost:5173/teste-qr
- Validador: http://localhost:5173/validador
- Meus Ingressos: http://localhost:5173/meus-ingressos

---

**💡 Dica:** Use o método da "dupla janela" para o teste mais realista!
