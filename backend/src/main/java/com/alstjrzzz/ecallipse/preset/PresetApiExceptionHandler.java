package com.alstjrzzz.ecallipse.preset;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class PresetApiExceptionHandler {
    @ExceptionHandler(PresetApplicationService.PresetNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiError notFound(RuntimeException exception) {
        return error(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler(PresetApplicationService.PresetAccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiError forbidden(RuntimeException exception) {
        return error(HttpStatus.FORBIDDEN, exception.getMessage());
    }

    private ApiError error(HttpStatus status, String message) {
        return new ApiError(status.value(), status.getReasonPhrase(), message, Instant.now());
    }

    public record ApiError(int status, String error, String message, Instant timestamp) {
    }
}
