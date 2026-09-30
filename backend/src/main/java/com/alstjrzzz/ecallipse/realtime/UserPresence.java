package com.alstjrzzz.ecallipse.realtime;

@FunctionalInterface
public interface UserPresence {
    /** A user is online while at least one application WebSocket is open for them. */
    boolean isOnline(String userId);
}
