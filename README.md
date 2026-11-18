# NowWork

Espaço de estudos por matéria. Disponível em [GitHub Pages](https://leo-ytnk.github.io/Estudos/).

- **Visão geral** com prazos, próxima ação e progresso do dia.
- **Tarefas** com prazos, prioridade, subtarefas, filtros e arquivo.
- **Agenda** semanal para organizar exercícios, entregas e compromissos.
- **Cadernos** por matéria com páginas, blocos reordenáveis, checklists e links.
- **Revisão** por cartões de pergunta e resposta com agendamento por desempenho.
- **Foco e evolução** com cronômetro, pausas e histórico.
- **Busca** por matéria ou pelo conteúdo de registros e páginas, com Ctrl/Cmd+K.

Os dados ficam no navegador. A seção Configurações permite exportar e importar backups JSON. Os registros e backups da versão Brisa são compatíveis com o NowWork no mesmo endereço.

## Desenvolvimento

```sh
npm install
npm run dev
npm test
npm run build
```

O GitHub Actions publica o diretório `dist` no GitHub Pages a partir de `main`. O Vite usa a base `/Estudos/` na produção.

Licença MIT.
