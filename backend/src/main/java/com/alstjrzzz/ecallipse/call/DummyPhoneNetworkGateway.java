package com.alstjrzzz.ecallipse.call;

import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/** Simulates a phone network whose every number answers after a fixed delay. No audio is carried. */
@Component
class DummyPhoneNetworkGateway implements PhoneNetworkGateway {
    private final Duration answerDelay;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(runnable -> {
        Thread thread = new Thread(runnable, "dummy-phone-network");
        thread.setDaemon(true);
        return thread;
    });

    DummyPhoneNetworkGateway(@Value("${ecallipse.dummy-phone-network.answer-delay:PT3S}") Duration answerDelay) {
        this.answerDelay = answerDelay;
    }

    @Override
    public void dial(CallSession call, Runnable onAnswered) {
        scheduler.schedule(onAnswered, answerDelay.toMillis(), TimeUnit.MILLISECONDS);
    }

    @PreDestroy
    void shutdown() {
        scheduler.shutdownNow();
    }
}
