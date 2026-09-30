package com.alstjrzzz.ecallipse.realtime;

import java.util.UUID;

@FunctionalInterface
public interface CallEventPublisher {
    void publish(UUID callId, String type, Object payload);
}
