package com.alstjrzzz.ecallipse.call;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** POC stand-in for a real push provider. */
@Component
class LoggingPushNotifier implements PushNotifier {
    private static final Logger log = LoggerFactory.getLogger(LoggingPushNotifier.class);

    @Override
    public void notifyIncomingCall(String userId, CallSession call) {
        log.info("dummy push: incoming call {} from {} to offline user {}", call.id(), call.callerId(), userId);
    }
}
