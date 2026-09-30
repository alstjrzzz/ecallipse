import type { CallDestination, CallSession, TranscriptSegment, WidgetLayout, WidgetPreset } from './domain';

type RequestOptions = Omit<RequestInit, 'body'> & {body?: unknown};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {'Content-Type': 'application/json', ...options.headers},
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'message' in body ? String(body.message) : response.statusText;
    throw new Error(message || 'Request failed');
  }
  return body as T;
}

export const callApi = {
  create(callerId: string, destination: CallDestination) {
    return request<CallSession>('/api/calls', {method: 'POST', body: {callerId, destination}});
  },
  presence(userIds: string[]) {
    return request<Record<string, boolean>>(`/api/presence?userIds=${userIds.map(encodeURIComponent).join(',')}`);
  },
  get(callId: string) {
    return request<CallSession>(`/api/calls/${callId}`);
  },
  accept(callId: string, userId: string) {
    return request<CallSession>(`/api/calls/${callId}/accept`, {method: 'POST', body: {userId}});
  },
  hangup(callId: string, userId: string) {
    return request<CallSession>(`/api/calls/${callId}/hangup`, {method: 'POST', body: {userId}});
  },
  ringing(userId: string) {
    return request<CallSession[]>(`/api/users/${encodeURIComponent(userId)}/calls/ringing`);
  },
  transcript(callId: string) {
    return request<TranscriptSegment[]>(`/api/calls/${callId}/transcript`);
  },
  submitDemoTranscript(callId: string, speakerId: string, text: string, sequence: number) {
    return request(`/api/poc/calls/${callId}/transcript`, {
      method: 'POST',
      body: {
        segmentId: `demo-${Date.now()}`,
        sequence,
        revision: 0,
        speakerId,
        text,
        finalSegment: true,
      },
    });
  },
};

/** Every preset is readable by everyone; only its owner can write it. See domain.ts WidgetPreset. */
export const presetApi = {
  list() {
    return request<WidgetPreset[]>('/api/presets');
  },
  create(ownerId: string, name: string, description: string, layout: WidgetLayout[]) {
    return request<WidgetPreset>('/api/presets', {method: 'POST', body: {ownerId, name, description, layout}});
  },
  update(id: string, callerId: string, name: string, description: string, layout: WidgetLayout[]) {
    return request<WidgetPreset>(`/api/presets/${id}`, {method: 'PUT', body: {callerId, name, description, layout}});
  },
  remove(id: string, callerId: string) {
    return request<void>(`/api/presets/${id}?callerId=${encodeURIComponent(callerId)}`, {method: 'DELETE'});
  },
};
