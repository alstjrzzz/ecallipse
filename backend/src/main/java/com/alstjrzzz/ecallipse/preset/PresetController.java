package com.alstjrzzz.ecallipse.preset;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/presets")
public class PresetController {
    private final PresetApplicationService presets;

    public PresetController(PresetApplicationService presets) {
        this.presets = presets;
    }

    /** Every user sees every preset: built-in themes and every other user's presets are all readable. */
    @GetMapping
    public List<WidgetPreset> list() {
        return presets.list();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WidgetPreset create(@Valid @RequestBody CreatePresetRequest request) {
        return presets.create(request.ownerId(), request.name(), request.description(), request.layout());
    }

    @PutMapping("/{id}")
    public WidgetPreset update(@PathVariable UUID id, @Valid @RequestBody UpdatePresetRequest request) {
        return presets.update(id, request.callerId(), request.name(), request.description(), request.layout());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable UUID id, @RequestParam String callerId) {
        presets.remove(id, callerId);
    }

    public record CreatePresetRequest(
            @NotBlank String ownerId,
            @NotBlank String name,
            String description,
            @NotNull List<@Valid WidgetLayoutItem> layout
    ) {
    }

    public record UpdatePresetRequest(
            @NotBlank String callerId,
            @NotBlank String name,
            String description,
            @NotNull List<@Valid WidgetLayoutItem> layout
    ) {
    }
}
