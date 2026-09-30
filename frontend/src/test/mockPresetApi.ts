import {vi} from 'vitest';
import type {WidgetPreset} from '../domain';

/**
 * Presets are now a shared backend resource (PresetsContext fetches them), so any component test
 * that renders PresetsProvider needs `fetch` stubbed. This mimics the real PresetController closely
 * enough for tests: list/create/update/delete, with the same builtin/ownership rules.
 */
function fakeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

export function installPresetApiMock(seed: WidgetPreset[] = []) {
  let presets = seed.map((preset) => ({...preset, layout: preset.layout.map((widget) => ({...widget}))}));

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input.toString();
    const url = new URL(raw, 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined;

    if (url.pathname === '/api/presets' && method === 'GET') {
      return fakeResponse(presets);
    }

    if (url.pathname === '/api/presets' && method === 'POST' && body) {
      const created: WidgetPreset = {
        id: `preset-${Math.random().toString(36).slice(2, 10)}`,
        ownerId: body.ownerId as string,
        name: body.name as string,
        description: (body.description as string | undefined) ?? '',
        layout: body.layout as WidgetPreset['layout'],
        builtin: false,
        createdAt: new Date().toISOString(),
      };
      presets = [...presets, created];
      return fakeResponse(created, 201);
    }

    const idMatch = /^\/api\/presets\/([^/]+)$/.exec(url.pathname);
    if (idMatch && method === 'PUT' && body) {
      const current = presets.find((preset) => preset.id === idMatch[1]);
      if (!current) return fakeResponse({message: 'preset not found'}, 404);
      if (current.builtin || current.ownerId !== body.callerId) return fakeResponse({message: 'only the owner can change this preset'}, 403);
      const updated = {...current, name: body.name as string, description: (body.description as string | undefined) ?? '', layout: body.layout as WidgetPreset['layout']};
      presets = presets.map((preset) => preset.id === current.id ? updated : preset);
      return fakeResponse(updated);
    }
    if (idMatch && method === 'DELETE') {
      const current = presets.find((preset) => preset.id === idMatch[1]);
      if (!current) return fakeResponse({message: 'preset not found'}, 404);
      if (current.builtin || current.ownerId !== url.searchParams.get('callerId')) return fakeResponse({message: 'only the owner can change this preset'}, 403);
      presets = presets.filter((preset) => preset.id !== current.id);
      return fakeResponse(undefined, 204);
    }

    throw new Error(`unhandled request in test: ${method} ${url.pathname}`);
  });

  vi.stubGlobal('fetch', fetchMock);
  return {get presets() { return presets; }};
}

export function builtinPreset(overrides: Partial<WidgetPreset> = {}): WidgetPreset {
  return {
    id: overrides.id ?? 'builtin-1',
    ownerId: null,
    name: '업무 전화',
    description: '대화를 기록하고 결정사항과 다음 행동을 놓치지 않는다.',
    builtin: true,
    createdAt: '2026-09-01T00:00:00Z',
    layout: [
      {id: 'call-stage-1', type: 'call-stage', x: 20, y: 20, width: 380, height: 300, zIndex: 1},
      {id: 'transcript-2', type: 'transcript', x: 420, y: 20, width: 400, height: 300, zIndex: 2},
    ],
    ...overrides,
  };
}
