package com.alstjrzzz.ecallipse.realtime;

import java.util.UUID;

@FunctionalInterface
public interface UserEventPublisher {
    void publishToUser(String userId, UUID callId, String type, Object payload);
}
