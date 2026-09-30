/* oxlint-disable react-refresh/only-export-components */
import {createContext, useContext, useEffect, useState, type PropsWithChildren} from 'react';
import {presetApi} from '../api';
import {useAuth} from '../auth/AuthContext';
import type {WidgetLayout, WidgetPreset} from '../domain';

const defaultPrefKey = (userId: string) => `ecallipse.default-preset.${userId}`;

const LOADING_PRESET: WidgetPreset = {
  id: '__loading__',
  ownerId: null,
  name: 'Loading…',
  description: '',
  layout: [],
  builtin: true,
  createdAt: new Date(0).toISOString(),
};

type PresetsContextValue = {
  /** Every preset: built-in themes and every user's, including other users'. */
  presets: WidgetPreset[];
  myPresets: WidgetPreset[];
  builtinPresets: WidgetPreset[];
  /** Other users' presets — visible to everyone, editable by none but their owner. */
  communityPresets: WidgetPreset[];
  defaultPreset: WidgetPreset;
  loading: boolean;
  error: string | null;
  getPreset: (id: string) => WidgetPreset | undefined;
  canEdit: (preset: Pick<WidgetPreset, 'ownerId' | 'builtin'>) => boolean;
  create: (name: string, layout?: WidgetLayout[], description?: string) => Promise<WidgetPreset>;
  update: (id: string, patch: Partial<Pick<WidgetPreset, 'name' | 'description' | 'layout'>>) => void;
  remove: (id: string) => void;
  setDefault: (id: string) => void;
  refresh: () => Promise<void>;
};

const PresetsContext = createContext<PresetsContextValue | null>(null);

export function PresetsProvider({children}: PropsWithChildren) {
  const {user} = useAuth();
  // Presets are shared server-side, but "which one opens by default" is a personal preference tied to the signed-in user.
  return <SharedPresets key={user?.id ?? 'anonymous'} userId={user?.id ?? null}>{children}</SharedPresets>;
}

function SharedPresets({userId, children}: PropsWithChildren<{userId: string | null}>) {
  const [presets, setPresets] = useState<WidgetPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultId, setDefaultId] = useState<string | null>(() => userId ? localStorage.getItem(defaultPrefKey(userId)) : null);

  const refresh = async () => {
    try {
      const list = await presetApi.list();
      // oxlint-disable-next-line react-hooks/set-state-in-effect
      setPresets(list);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '프리셋을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // Presets are shared: fetched once per signed-in identity, not re-fetched on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const myPresets = presets.filter((preset) => preset.ownerId === userId);
  const builtinPresets = presets.filter((preset) => preset.builtin);
  const communityPresets = presets.filter((preset) => !preset.builtin && preset.ownerId !== userId);
  const canEdit = (preset: Pick<WidgetPreset, 'ownerId' | 'builtin'>) => !preset.builtin && !!userId && preset.ownerId === userId;
  const defaultPreset = presets.find((preset) => preset.id === defaultId) ?? myPresets[0] ?? builtinPresets[0] ?? LOADING_PRESET;

  const setDefault = (id: string) => {
    if (!presets.some((preset) => preset.id === id)) return;
    setDefaultId(id);
    if (userId) localStorage.setItem(defaultPrefKey(userId), id);
  };

  const create = async (name: string, layout: WidgetLayout[] = [], description = '') => {
    if (!userId) throw new Error('not signed in');
    const created = await presetApi.create(userId, name, description, layout);
    setPresets((current) => [...current, created]);
    return created;
  };

  // Optimistic: the canvas must feel instant, so the local list updates immediately and the write happens in the background.
  const update = (id: string, patch: Partial<Pick<WidgetPreset, 'name' | 'description' | 'layout'>>) => {
    const current = presets.find((preset) => preset.id === id);
    if (!current || !canEdit(current) || !userId) return;
    const merged = {...current, ...patch};
    setPresets((list) => list.map((preset) => preset.id === id ? merged : preset));
    presetApi.update(id, userId, merged.name, merged.description, merged.layout)
      .then((saved) => setPresets((list) => list.map((preset) => preset.id === id ? saved : preset)))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '프리셋을 저장하지 못했습니다.'));
  };

  const remove = (id: string) => {
    const current = presets.find((preset) => preset.id === id);
    if (!current || !canEdit(current) || !userId) return;
    const fallback = builtinPresets.find((preset) => preset.id !== id) ?? myPresets.find((preset) => preset.id !== id);
    setPresets((list) => list.filter((preset) => preset.id !== id));
    if (defaultId === id && fallback) setDefault(fallback.id);
    presetApi.remove(id, userId).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : '프리셋을 삭제하지 못했습니다.');
      void refresh();
    });
  };

  return (
    <PresetsContext.Provider value={{
      presets,
      myPresets,
      builtinPresets,
      communityPresets,
      defaultPreset,
      loading,
      error,
      getPreset: (id) => presets.find((preset) => preset.id === id),
      canEdit,
      create,
      update,
      remove,
      setDefault,
      refresh,
    }}
    >
      {children}
    </PresetsContext.Provider>
  );
}

export function usePresets() {
  const context = useContext(PresetsContext);
  if (!context) throw new Error('usePresets must be used inside PresetsProvider');
  return context;
}
