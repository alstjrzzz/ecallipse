package com.alstjrzzz.ecallipse.preset;

import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Presets are shared, readable by every user, and writable only by their owner.
 * Built-in presets (ownerId == null) are never writable. In-memory for the POC,
 * same pattern as {@link com.alstjrzzz.ecallipse.call.CallApplicationService}.
 */
@Service
public class PresetApplicationService {
    private final Map<UUID, WidgetPreset> presets = new LinkedHashMap<>();
    private final Clock clock;

    public PresetApplicationService(Clock clock) {
        this.clock = clock;
        seedBuiltins();
    }

    public synchronized List<WidgetPreset> list() {
        return presets.values().stream()
                .sorted(Comparator.comparing(WidgetPreset::createdAt))
                .toList();
    }

    public synchronized WidgetPreset get(UUID id) {
        WidgetPreset preset = presets.get(id);
        if (preset == null) {
            throw new PresetNotFoundException(id);
        }
        return preset;
    }

    public synchronized WidgetPreset create(String ownerId, String name, String description, List<WidgetLayoutItem> layout) {
        UUID id = UUID.randomUUID();
        WidgetPreset preset = new WidgetPreset(id, ownerId, name, description == null ? "" : description, layout, false, Instant.now(clock));
        presets.put(id, preset);
        return preset;
    }

    public synchronized WidgetPreset update(UUID id, String callerId, String name, String description, List<WidgetLayoutItem> layout) {
        WidgetPreset current = get(id);
        requireOwner(current, callerId);
        WidgetPreset updated = new WidgetPreset(
                current.id(), current.ownerId(), name, description == null ? "" : description, layout, current.builtin(), current.createdAt()
        );
        presets.put(id, updated);
        return updated;
    }

    public synchronized void remove(UUID id, String callerId) {
        WidgetPreset current = get(id);
        requireOwner(current, callerId);
        presets.remove(id);
    }

    private void requireOwner(WidgetPreset preset, String callerId) {
        if (preset.builtin() || !preset.isOwnedBy(callerId)) {
            throw new PresetAccessDeniedException("only the owner can change this preset");
        }
    }

    private void seedBuiltins() {
        seedBuiltin(
                "업무 전화",
                "대화를 기록하고 결정사항과 다음 행동을 놓치지 않는다.",
                List.of(
                        item("call-stage", 20, 20, 380, 300, 1),
                        item("transcript", 420, 20, 400, 300, 2),
                        item("next-action", 420, 340, 400, 220, 3),
                        item("checklist", 20, 340, 380, 220, 4)
                )
        );
        seedBuiltin(
                "문의 · 예약 · 해지",
                "확인할 항목을 체크하며 진행하고 빠진 질문을 다음 행동으로 받는다.",
                List.of(
                        item("call-stage", 20, 20, 380, 260, 1),
                        item("checklist", 420, 20, 380, 380, 2),
                        item("next-action", 20, 300, 380, 220, 3)
                )
        );
        seedBuiltin(
                "가볍게",
                "AI 없이 메모만 남긴다. 음성 인식과 비용이 발생하지 않는다.",
                List.of(
                        item("call-stage", 20, 20, 380, 260, 1),
                        item("notes", 420, 20, 400, 380, 2)
                )
        );
    }

    private void seedBuiltin(String name, String description, List<WidgetLayoutItem> layout) {
        UUID id = UUID.randomUUID();
        presets.put(id, new WidgetPreset(id, null, name, description, layout, true, Instant.now(clock)));
    }

    private static WidgetLayoutItem item(String type, double x, double y, double width, double height, int zIndex) {
        return new WidgetLayoutItem(type + "-" + zIndex, type, x, y, width, height, zIndex);
    }

    public static class PresetNotFoundException extends RuntimeException {
        public PresetNotFoundException(UUID id) {
            super("preset not found: " + id);
        }
    }

    public static class PresetAccessDeniedException extends RuntimeException {
        public PresetAccessDeniedException(String message) {
            super(message);
        }
    }
}
