package com.alstjrzzz.ecallipse.call;

/** Places calls to external phone numbers. Real carrier integration is deferred (REQ-ROUTE-003). */
@FunctionalInterface
public interface PhoneNetworkGateway {
    /** Starts dialing. {@code onAnswered} is invoked when the remote party picks up. */
    void dial(CallSession call, Runnable onAnswered);
}
