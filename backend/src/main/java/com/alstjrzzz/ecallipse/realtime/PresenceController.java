package com.alstjrzzz.ecallipse.realtime;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/presence")
public class PresenceController {
    private final UserPresence presence;

    public PresenceController(UserPresence presence) {
        this.presence = presence;
    }

    @GetMapping
    public Map<String, Boolean> online(@RequestParam List<String> userIds) {
        Map<String, Boolean> result = new LinkedHashMap<>();
        for (String userId : userIds) {
            result.put(userId, presence.isOnline(userId));
        }
        return result;
    }
}
