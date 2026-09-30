package com.alstjrzzz.ecallipse.preset;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * One widget's placement inside a preset. The backend does not know the catalog of widget
 * {@code type} values — that is owned by the frontend — so {@code type} is stored and returned opaquely.
 */
public record WidgetLayoutItem(
        @NotBlank String id,
        @NotBlank String type,
        @PositiveOrZero double x,
        @PositiveOrZero double y,
        @Positive double width,
        @Positive double height,
        @PositiveOrZero int zIndex
) {
}
