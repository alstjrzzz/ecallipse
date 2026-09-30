import type {Contact, DataSource, UserProfile, WidgetType} from './domain';

export const USERS: Record<string, UserProfile> = {
  alice: {
    id: 'alice',
    name: 'Alice Kim',
    email: 'alice@ecallipse.local',
    role: 'Product Designer',
    initials: 'AK',
    accent: '#8b7cf6',
    sipExtension: '1000',
  },
  bob: {
    id: 'bob',
    name: 'Bob Lee',
    email: 'bob@ecallipse.local',
    role: 'Product Manager',
    initials: 'BL',
    accent: '#36c5a4',
    sipExtension: '1001',
  },
};

export const CONTACTS: Contact[] = [
  {id: 'alice', name: 'Alice Kim', role: 'Product Designer', initials: 'AK', accent: '#8b7cf6', lastContact: '어제', app: {userId: 'alice', sipExtension: '1000'}},
  {id: 'bob', name: 'Bob Lee', role: 'Product Manager', initials: 'BL', accent: '#36c5a4', lastContact: '2시간 전', app: {userId: 'bob', sipExtension: '1001'}},
  // Has no login in the POC, so the app route always ends in a push notification. The phone route is a dummy network.
  {id: 'mina', name: 'Mina Park', role: 'Legal Counsel', initials: 'MP', accent: '#ee9b65', lastContact: '지난주', app: {userId: 'mina', sipExtension: '1002'}, phoneNumber: '+82 10-5550-0142'},
  {id: 'seoul-dental', name: 'Seoul Dental Clinic', role: 'Reservation desk', initials: 'SD', accent: '#5fa8e8', lastContact: '3주 전', phoneNumber: '+82 2-555-0142'},
];

export const WIDGET_CATALOG: Array<{type: WidgetType; title: string; description: string; sources: DataSource[]; removable: boolean}> = [
  // The call stage is not in the "Add widget" list — every layout gets exactly one, and it cannot be removed.
  {type: 'call-stage', title: 'Call Stage', description: '상대방과 통화 상태를 보여주는 메인 화면.', sources: [], removable: false},
  {type: 'transcript', title: 'Live Transcript', description: '대화를 순서대로 기록한다.', sources: ['transcript'], removable: true},
  {type: 'next-action', title: 'Next Action', description: '다음 행동을 실시간으로 제안한다.', sources: ['transcript'], removable: true},
  {type: 'checklist', title: 'Checklist', description: '통화 목적과 확인 항목을 관리한다.', sources: [], removable: true},
  {type: 'notes', title: 'Quick Notes', description: '통화 중 메모를 남긴다.', sources: [], removable: true},
  {type: 'call-details', title: 'Call Details', description: '참가자와 연결 상태를 확인한다.', sources: [], removable: true},
];

export const ADDABLE_WIDGETS = WIDGET_CATALOG.filter((item) => item.type !== 'call-stage');

export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  transcript: 'Live transcript (STT)',
};
