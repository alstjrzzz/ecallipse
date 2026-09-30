export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  accent: string;
  sipExtension: string;
};

/** A person or number the user can call. A contact can be reachable through the app, the phone network, or both. */
export type Contact = {
  id: string;
  name: string;
  role: string;
  initials: string;
  accent: string;
  lastContact: string;
  app?: {userId: string; sipExtension: string};
  phoneNumber?: string;
};

export type CallRoute = 'app' | 'phone';

export type CallDestination = {
  type: 'INTERNAL_USER' | 'EXTERNAL_PHONE';
  address: string;
};

/** How the backend reached the destination when the call was created. */
export type CallDelivery = 'APP_REALTIME' | 'APP_PUSH' | 'PHONE_NETWORK';

export type CallStatus = 'RINGING' | 'ACTIVE' | 'ENDED';

export type CallSession = {
  id: string;
  callerId: string;
  destination: CallDestination;
  delivery: CallDelivery;
  status: CallStatus;
  createdAt: string;
  acceptedAt: string | null;
  endedAt: string | null;
};

export type TranscriptSegment = {
  callId: string;
  segmentId: string;
  sequence: number;
  revision: number;
  speakerId: string;
  text: string;
  finalSegment: boolean;
  receivedAt: string;
};

export type NextAction = {
  callId: string;
  sourceSegmentId: string;
  sourceRevision: number;
  text: string;
  generatedAt: string;
};

export type CallRealtimeEvent = {
  callId: string;
  eventSequence: number;
  type: 'call.ringing' | 'call.incoming' | 'call.active' | 'call.ended' | 'transcript.updated' | 'assistance.next-action';
  occurredAt: string;
  payload: CallSession | TranscriptSegment | NextAction;
};

export type WidgetType = 'call-stage' | 'transcript' | 'next-action' | 'checklist' | 'notes' | 'call-details';

/** Call-level data a widget consumes. A widget is a view; the source keeps running without the widget that shows it. */
export type DataSource = 'transcript';

export type WidgetLayout = {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

/**
 * A reusable call workspace composition, shared: every user can read every preset (built-in
 * themes and everyone else's), but only the owner can change or remove their own, and a
 * built-in theme (ownerId null) can never be changed by anyone.
 */
export type WidgetPreset = {
  id: string;
  ownerId: string | null;
  name: string;
  description: string;
  layout: WidgetLayout[];
  builtin: boolean;
  createdAt: string;
};

/** What the user decided before this particular call started. Layout is a per-call copy of the preset. */
export type CallSetup = {
  presetId: string;
  layout: WidgetLayout[];
  goal: string;
  checklist: string[];
};
