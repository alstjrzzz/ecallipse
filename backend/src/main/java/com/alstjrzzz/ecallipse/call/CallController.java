package com.alstjrzzz.ecallipse.call;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/calls")
public class CallController {
    private final CallApplicationService calls;

    public CallController(CallApplicationService calls) {
        this.calls = calls;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CallSession create(@Valid @RequestBody CreateCallRequest request) {
        return calls.create(request.callerId(), request.destination());
    }

    @GetMapping("/{callId}")
    public CallSession get(@PathVariable UUID callId) {
        return calls.get(callId);
    }

    @PostMapping("/{callId}/accept")
    public CallSession accept(@PathVariable UUID callId, @Valid @RequestBody UserActionRequest request) {
        return calls.accept(callId, request.userId());
    }

    @PostMapping("/{callId}/hangup")
    public CallSession hangup(@PathVariable UUID callId, @Valid @RequestBody UserActionRequest request) {
        return calls.hangup(callId, request.userId());
    }

    public record CreateCallRequest(@NotBlank String callerId, @NotNull @Valid CallDestination destination) {
    }

    public record UserActionRequest(@NotBlank String userId) {
    }
}
