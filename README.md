# brisa.

**Adeus burnout e sobrecarga.** Um assistente de produtividade e bem-estar que ajuda você a decidir o que fazer — e quando descansar.

Protótipo gratuito, local, de código aberto. Sem conta, anúncios, coleta remota ou API de IA. O assistente usa regras transparentes; não diz saber o que não foi registrado.

## As três áreas

- **Agora:** mensagem contextual, disposição declarada, prioridade explicável, foco e pausa.
- **Mente:** captura rápida de tarefas, compromissos, preocupações e ideias; detalhes sob demanda; edição, etapas, adiamento, conclusão, arquivo e exclusão.
- **Evolução:** conquistas, sete dias de progresso, equilíbrio entre atividade e descanso, pontos não punitivos e recompensas personalizadas.

As preocupações são registros, não obrigações automáticas. Pontos nunca são retirados por descanso, adiamento ou inatividade.

## Executar

Requisitos: Node.js 20.19+ ou 22.12+.

1. Clone o repositório.
2. Execute `npm install`.
3. Execute `npm run dev`.
4. Abra o endereço local mostrado pelo Vite.

Outros comandos: `npm test` (regras de negócio), `npm run build` (compilação para produção) e `npm run preview` (prévia da compilação).

## Publicar no GitHub Pages

O projeto já possui um workflow em `.github/workflows/pages.yml` e define `base: '/Estudos/'` no Vite para o repositório atual.

1. Abra **Settings > Pages** do repositório.
2. Em **Build and deployment**, escolha **GitHub Actions** como fonte.
3. Faça um push para `main` ou execute o workflow manualmente em **Actions**.
4. Após a execução bem-sucedida, o site estará disponível em **https://leo-ytnk.github.io/Estudos/**.

Se renomear o repositório, ajuste a propriedade `base` em `vite.config.ts`.

## Privacidade e backup

Os dados são salvos no IndexedDB do navegador, com alternativa em localStorage quando necessário. Nunca são enviados a um servidor. Dados do navegador podem ser apagados pelo próprio navegador: use **Configurações > Exportar backup** periodicamente. O backup JSON pode ser restaurado em outro dispositivo, substituindo os dados locais.

Os dados de demonstração são **opcionais**, identificados em cada registro e podem ser removidos pelas configurações. As ações realmente realizadas durante a demonstração permanecem no histórico de conquistas.

## Design system e estrutura

- `src/styles/tokens.css`: cores, escala de espaços, raios, sombras e modo escuro.
- `src/styles/app.css`: layout responsivo e padrões de componentes.
- `src/components/ui.tsx`: botões, superfícies, chips, campos e estados reutilizáveis.
- `src/components/ElasticSheet.tsx`: painel inferior com arraste direto, limite exponencial e mola interrompível.
- `src/lib/motion.ts`: parâmetros físicos compartilhados.
- `src/lib/engine.ts`: prioridade explicável, contexto, pontos e histórico semanal.
- `src/lib/storage.ts`: IndexedDB, backup e validação.
- `src/state/AppState.tsx`: ações e persistência.
- `src/tabs/`: somente Agora, Mente e Evolução.

### Critério de prioridade

A seleção considera prazo, importância declarada, minutos estimados, esforço versus disposição e quantidade de adiamentos. Só **tarefas ativas** entram na seleção automática; ideias, compromissos e preocupações continuam visíveis sem virar tarefas por conta própria. A justificativa fica visível no cartão da recomendação.

### Movimento

O painel reage ao deslocamento durante o gesto, com resistência `E(d)=sgn(d)·L·(1−exp(−|d|/L))`, usando `L=72px`. Ao soltar, a mola incorpora velocidade; ao tocar de novo, o movimento anterior é interrompido. A área de arraste é exclusiva do puxador, evitando conflito com rolagem. Preferências de movimento reduzido do sistema e da aplicação são respeitadas.

## Verificações recomendadas

Teste em um navegador mobile e desktop: criar, editar, dividir em etapas, concluir, adiar, arquivar, excluir/desfazer; atualizar a página; alternar temas; resgatar pontos; registrar pausas; importar/exportar JSON; usar teclado; ativar movimento reduzido e arrastar o puxador enquanto a mola retorna.

> Este é um protótipo de apoio à organização, não um serviço clínico nem uma ferramenta para diagnosticar ou tratar burnout.

## Licença

MIT — veja `LICENSE`.
