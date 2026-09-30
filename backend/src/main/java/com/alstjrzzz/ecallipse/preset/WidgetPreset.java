package com.alstjrzzz.ecallipse.preset;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** A reusable, named call workspace composition. {@code ownerId} is null for a built-in preset. */
public record WidgetPreset(
        UUID id,
        String ownerId,
        String name,
        String description,
        List<WidgetLayoutItem> layout,
        boolean builtin,
        Instant createdAt
) {
    public boolean isOwnedBy(String userId) {
        return ownerId != null && ownerId.equals(userId);
    }
}
