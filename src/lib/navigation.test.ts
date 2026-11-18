import { describe, expect, it } from 'vitest';
import { areas, parseRoute, routeHref, type Route } from './navigation';

describe('rotas do NowWork', () => {
  it('abre a visão de hoje com a URL original e recupera rotas desconhecidas', () => {
    expect(parseRoute('')).toEqual(areas.hoje);
    expect(parseRoute('#/outro')).toEqual(areas.hoje);
  });

  it('abre o caderno ao entrar na matéria e mantém o caminho de uma página', () => {
    expect(parseRoute('#/materias/ciencias')).toMatchObject({ area: 'materias', subjectId: 'ciencias', view: 'caderno' });
    const route: Route = { area: 'materias', subjectId: 'Ciências/8°', view: 'caderno', noteId: 'Resumo #1' };
    expect(parseRoute(routeHref(route))).toEqual(route);
    expect(parseRoute('#/materias/%')).toEqual(areas.materias);
  });

  it('mantém as subáreas, os registros encontrados pela busca e seus valores padrão', () => {
    expect(parseRoute('#/planejar')).toMatchObject(areas.planejar);
    expect(parseRoute('#/planejar/agenda')).toMatchObject({ area: 'planejar', view: 'agenda' });
    expect(parseRoute(routeHref({ area: 'planejar', view: 'entrada', entryId: 'idea/a' })))
      .toEqual({ area: 'planejar', view: 'entrada', entryId: 'idea/a' });
    expect(parseRoute('#/estudar/progresso')).toEqual({ area: 'estudar', view: 'progresso' });
  });
});
