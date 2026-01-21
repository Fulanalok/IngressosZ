# 📷 **SOLUÇÃO: Câmera não liga no QR Scanner**

## 🚨 **Problema Comum:**

O navegador bloqueia acesso à câmera por padrões de segurança.

---

## ✅ **SOLUÇÕES TESTADAS:**

### **1. Permissões do Navegador (PRINCIPAL)**

#### **Chrome/Edge:**

1. Clique no ícone 🔒 ou 📷 na barra de endereço (à esquerda do URL)
2. Selecione **"Permitir"** para Câmera
3. Recarregue a página (F5)
4. Teste novamente

#### **Firefox:**

1. Clique no ícone 🔒 à esquerda do URL
2. Vá em **Permissões** > **Câmera** > **Permitir**
3. Recarregue a página
4. Teste novamente

#### **Safari:**

1. **Safari** > **Preferências** > **Sites**
2. Selecione **Câmera** na lateral
3. Encontre `localhost:5173` e mude para **Permitir**
4. Recarregue a página

---

### **2. Configurações de Sistema**

#### **Windows:**

1. **Configurações** > **Privacidade** > **Câmera**
2. Ative **"Permitir aplicativos de área de trabalho acesso à câmera"**
3. Ative **"Permitir aplicativos da Microsoft Store acesso à câmera"**

#### **macOS:**

1. **Preferências do Sistema** > **Segurança e Privacidade** > **Câmera**
2. Marque a caixa do seu navegador (Chrome, Firefox, etc.)

---

### **3. Métodos de Teste**

#### **Método A: Teste Básico**

1. Acesse: `http://localhost:5173/teste-qr`
2. Use o componente **"Teste de Câmera"**
3. Clique **"Ligar Câmera"**
4. Observe as mensagens de erro específicas

#### **Método B: Console do Navegador**

1. Pressione **F12** para abrir DevTools
2. Vá na aba **Console**
3. Digite: `navigator.mediaDevices.getUserMedia({video: true})`
4. Veja o erro específico retornado

#### **Método C: Verificação Manual**

1. Abra uma nova aba
2. Vá para `https://webcamtests.com`
3. Teste se a câmera funciona em outros sites

---

### **4. Erros Específicos e Soluções**

#### **"NotAllowedError"**

- **Causa:** Permissão negada
- **Solução:** Seguir passos das permissões do navegador acima

#### **"NotFoundError"**

- **Causa:** Nenhuma câmera detectada
- **Solução:** Verificar se câmera está conectada/funcionando

#### **"NotReadableError"**

- **Causa:** Câmera em uso por outro app
- **Solução:** Fechar outros apps (Zoom, Teams, etc.)

#### **"OverconstrainedError"**

- **Causa:** Configurações de vídeo incompatíveis
- **Solução:** Atualizar código do scanner (já corrigido na versão atual)

---

### **5. Teste Alternativo (Fallback)**

Se a câmera não funcionar, use o **teste manual**:

1. No Validador, ao invés de "Scan QR"
2. Digite diretamente no campo: `test-ticket-123`
3. Clique "Validar Ingresso"
4. Sistema funcionará normalmente

---

### **6. Configuração HTTPS (Para Produção)**

⚠️ **Em produção, câmera só funciona com HTTPS!**

Para desenvolvimento local com HTTPS:

```bash
npm run dev -- --https
```

---

## 🔧 **TROUBLESHOOTING AVANÇADO:**

### **Reset Completo de Permissões:**

1. **Chrome:** `chrome://settings/content/camera`
2. Remover `localhost:5173` da lista
3. Visitar o site novamente
4. Permitir quando solicitado

### **Teste em Modo Incógnito:**

1. Abra janela privada/incógnito
2. Visite `http://localhost:5173/teste-qr`
3. Permita câmera quando solicitado
4. Teste funcionalidade

### **Verificar Drivers:**

- Windows: Device Manager > Câmeras
- Verificar se há erros ou avisos
- Atualizar drivers se necessário

---

## 📞 **Se nada funcionar:**

1. **Teste em outro navegador** (Chrome → Firefox)
2. **Teste em outro dispositivo** (outro PC/notebook)
3. **Use o método manual** de validação
4. **Verifique antivírus** (pode estar bloqueando)

---

**✅ Versão atualizada do scanner já inclui melhor detecção de erros e instruções automáticas!**
