package com.alstjrzzz.ecallipse.call;

/**
 * How the call reaches the destination. It is decided when the call is created
 * and describes the signalling path, not the lifetime of the logical call.
 */
public enum CallDelivery {
    /** Internal user with an open application WebSocket: the incoming UI is shown immediately. */
    APP_REALTIME,
    /** Internal user without an open application WebSocket: a push notification is sent and the call keeps ringing. */
    APP_PUSH,
    /** External phone number reached through the phone network (dummy gateway in the POC). */
    PHONE_NETWORK
}
