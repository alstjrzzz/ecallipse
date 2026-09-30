package com.alstjrzzz.ecallipse.call;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CallDestination(@NotNull Type type, @NotBlank String address) {
    public enum Type {
        INTERNAL_USER,
        EXTERNAL_PHONE
    }

    public static CallDestination internalUser(String userId) {
        return new CallDestination(Type.INTERNAL_USER, userId);
    }

    public static CallDestination externalPhone(String phoneNumber) {
        return new CallDestination(Type.EXTERNAL_PHONE, phoneNumber);
    }

    public boolean isInternalUser(String userId) {
        return type == Type.INTERNAL_USER && address.equals(userId);
    }
}
