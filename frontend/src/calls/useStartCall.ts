import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {callApi} from '../api';
import {useAuth} from '../auth/AuthContext';
import type {CallDestination, CallRoute, CallSetup, Contact} from '../domain';
import {saveCallSetup} from './callSetup';
import {useSipPhone} from './SipPhoneContext';

export type StartCallOptions = {route: CallRoute; setup: CallSetup};

export function useStartCall() {
  const {user} = useAuth();
  const phone = useSipPhone();
  const navigate = useNavigate();
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCall = async (contact: Contact, {route, setup}: StartCallOptions) => {
    if (!user) return;
    const destination: CallDestination | null = route === 'app' && contact.app
      ? {type: 'INTERNAL_USER', address: contact.app.userId}
      : route === 'phone' && contact.phoneNumber
        ? {type: 'EXTERNAL_PHONE', address: contact.phoneNumber}
        : null;
    if (!destination || destination.address === user.id) return;

    setStartingId(contact.id);
    setError(null);
    let callId: string | undefined;
    try {
      const call = await callApi.create(user.id, destination);
      callId = call.id;
      saveCallSetup(user.id, call.id, setup);
      // Only an online callee has a SIP leg to ring. An offline callee is dialed after they accept,
      // and a phone-network call has no SIP leg at all in the POC.
      if (call.delivery === 'APP_REALTIME' && contact.app) {
        await phone.call(contact.app.sipExtension);
      }
      navigate(`/calls/${call.id}`);
    } catch (reason) {
      if (callId) {
        await callApi.hangup(callId, user.id).catch(() => undefined);
      }
      setError(reason instanceof Error ? reason.message : '통화를 시작하지 못했습니다.');
    } finally {
      setStartingId(null);
    }
  };

  return {startCall, startingId, error, clearError: () => setError(null)};
}
