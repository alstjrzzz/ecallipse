package com.alstjrzzz.ecallipse.call;

/** Reaches an internal user who has no open application connection. */
@FunctionalInterface
public interface PushNotifier {
    void notifyIncomingCall(String userId, CallSession call);
}
