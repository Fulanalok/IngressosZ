# Rollout e rollback de roleVersion

## Modelo

`authorization/{uid}` é a fonte autoritativa de autorização. `users/{uid}.role`
é apenas um espelho de exibição. Custom claims carregam `role`, `admin` e
`roleVersion`; qualquer acesso privilegiado exige que esses valores coincidam
com um documento `status: "active"`.

Uma mudança reserva primeiro uma nova versão no Firestore e muda o documento
para `applying`. A partir desse commit, tokens anteriores deixam de funcionar.
Depois, o backend atualiza claims, revoga refresh tokens e finaliza
`authorization/{uid}` e `users/{uid}.role` na mesma transação Firestore.

Firebase Auth e Firestore não oferecem uma transação distribuída. Os estados
`applying` e `error` permanecem fail-closed e permitem que qualquer admin atual
retome a mesma `desiredRole`, usando o `operationId` persistido no servidor.

## Ordem obrigatória de rollout

O corte estrito não pode ser ativado antes do backfill.

1. Disponibilizar o código e o migrador no ambiente operacional, sem publicar
   ainda as Functions/Rules com verificação estrita. O script é executado com
   Admin SDK e não é um endpoint cliente.
2. Executar o backfill administrativo:

   ```bash
   CONFIRM_ROLE_MIGRATION=true \
     npm --prefix functions run migrate:role-authorizations
   ```

3. Verificar que todo usuário com claim `admin`, `organizer` ou `validator`
   possui:
   - `authorization/{uid}.status == "active"`;
   - role canônica igual à claim;
   - `roleVersion` inteira positiva igual à claim;
   - `users/{uid}.role` alinhada.
4. Fazer o primeiro deploy das Functions estritas junto das
   Firestore/Storage Rules estritas:

   ```bash
   npx firebase-tools deploy \
     --only functions,firestore:rules,storage \
     --project <your-firebase-project-id>
   ```

5. Com tokens emitidos antes do backfill, confirmar:
   - callable privilegiada retorna `permission-denied`;
   - leitura privilegiada Firestore é negada;
   - upload em `events/` no Storage é negado.
6. Renovar o token do usuário migrado e confirmar que o acesso legítimo volta.

O migrador deriva privilégios somente das custom claims do Firebase Auth,
preserva claims não relacionadas, revoga refresh tokens e é idempotente. Um
estado existente divergente resulta em `MANUAL_REVIEW_REQUIRED`, sem
sobrescrita silenciosa.

## Recuperação operacional

- `AUTH_SET_CLAIMS_FAILED`: repetir a mesma alteração de role.
- `AUTH_REVOKE_FAILED`: repetir; a operação não será ativada antes da revogação.
- `FINALIZE_FAILED`: repetir; claims podem já estar atualizadas, mas o estado
  não ativo continua negando acesso.
- `FINALIZE_CONFLICT`: inspecionar `authorization/{uid}` e a operação registrada;
  uma execução antiga não pode finalizar uma versão posterior.
- `MIGRATION_REQUIRED`: executar/verificar o migrador antes de alterar o usuário.

Não copiar tokens, refresh tokens, claims completas ou objetos de erro para
documentos ou tickets operacionais.

## Validação manual das Storage Rules

O Storage Emulator atual devolveu `storage/unknown` ao avaliar
`firestore.get()` entre produtos, sem expor um `PERMISSION_DENIED` testável.
Por isso não há uma suíte automatizada falsa para Storage neste repositório.

Validar em projeto de staging:

1. criar um organizer com autorização ativa e token da versão atual;
2. enviar uma imagem menor que 5 MB para `events/` e confirmar sucesso;
3. incrementar a versão ou mudar o status para `applying`;
4. repetir o mesmo upload com o token antigo e confirmar negação;
5. repetir com `status: error` e confirmar negação;
6. renovar o token, restaurar `active` coerente e confirmar sucesso;
7. confirmar que upload do próprio avatar continua independente de role.

Cada avaliação privilegiada do Storage faz uma única leitura lógica de
`authorization/{uid}`; chamadas repetidas ao mesmo caminho dentro da regra são
cacheadas pela plataforma.

## Rollback

Não reverta apenas Functions ou apenas Rules.

1. Interrompa novas mudanças de role.
2. Registre os documentos `applying/error` e seus `operationId`.
3. Se o código precisar voltar, publique em conjunto a versão anterior de
   Functions, Firestore Rules e Storage Rules.
4. Não apague `authorization` nem o histórico de operações.
5. Antes de reativar o corte estrito, execute novamente o migrador e retome as
   operações pendentes.

O rollback para verificações antigas reabre temporariamente a janela de tokens
antigos. Deve ser tratado como redução explícita de segurança e ter duração
mínima.
