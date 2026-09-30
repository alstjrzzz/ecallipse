package com.alstjrzzz.ecallipse.preset;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PresetApplicationServiceTest {
    private final PresetApplicationService presets = new PresetApplicationService(
            Clock.fixed(Instant.parse("2026-09-23T00:00:00Z"), ZoneOffset.UTC)
    );

    @Test
    void seedsThreeReadOnlyBuiltinThemes() {
        assertThat(presets.list())
                .hasSize(3)
                .allSatisfy(preset -> {
                    assertThat(preset.builtin()).isTrue();
                    assertThat(preset.ownerId()).isNull();
                });
    }

    @Test
    void everyUserCanReadEveryPresetButOnlyTheOwnerCanChangeIt() {
        WidgetPreset created = presets.create("alice", "Alice's mix", "", List.of(item("notes")));

        assertThat(presets.list()).extracting(WidgetPreset::id).contains(created.id());

        WidgetPreset updated = presets.update(created.id(), "alice", "Renamed", "desc", List.of(item("checklist")));
        assertThat(updated.name()).isEqualTo("Renamed");
        assertThat(updated.layout()).extracting(WidgetLayoutItem::type).containsExactly("checklist");

        assertThatThrownBy(() -> presets.update(created.id(), "bob", "Hijack", "", List.of()))
                .isInstanceOf(PresetApplicationService.PresetAccessDeniedException.class);
        assertThatThrownBy(() -> presets.remove(created.id(), "bob"))
                .isInstanceOf(PresetApplicationService.PresetAccessDeniedException.class);
    }

    @Test
    void aBuiltinThemeCanNeverBeChangedOrRemoved() {
        UUID builtinId = presets.list().getFirst().id();

        assertThatThrownBy(() -> presets.update(builtinId, "alice", "Mine now", "", List.of()))
                .isInstanceOf(PresetApplicationService.PresetAccessDeniedException.class);
        assertThatThrownBy(() -> presets.remove(builtinId, "alice"))
                .isInstanceOf(PresetApplicationService.PresetAccessDeniedException.class);
    }

    @Test
    void theOwnerCanRemoveTheirOwnPreset() {
        WidgetPreset created = presets.create("alice", "Mine", "", List.of(item("notes")));
        presets.remove(created.id(), "alice");

        assertThatThrownBy(() -> presets.get(created.id()))
                .isInstanceOf(PresetApplicationService.PresetNotFoundException.class);
    }

    private WidgetLayoutItem item(String type) {
        return new WidgetLayoutItem(type + "-1", type, 0, 0, 100, 100, 1);
    }
}
