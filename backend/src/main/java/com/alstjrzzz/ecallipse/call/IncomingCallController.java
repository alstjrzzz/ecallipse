package com.alstjrzzz.ecallipse.call;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class IncomingCallController {
    private final CallApplicationService calls;

    public IncomingCallController(CallApplicationService calls) {
        this.calls = calls;
    }

    @GetMapping("/{userId}/calls/ringing")
    public List<CallSession> ringing(@PathVariable String userId) {
        return calls.findRingingForCallee(userId);
    }
}
