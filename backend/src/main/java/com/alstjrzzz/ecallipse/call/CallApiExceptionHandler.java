package com.alstjrzzz.ecallipse.call;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class CallApiExceptionHandler {
    @ExceptionHandler(CallApplicationService.CallNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiError notFound(RuntimeException exception) {
        return error(HttpStatus.NOT_FOUND, exception.getMessage());
    }

    @ExceptionHandler(CallApplicationService.CallAccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiError forbidden(RuntimeException exception) {
        return error(HttpStatus.FORBIDDEN, exception.getMessage());
    }

    @ExceptionHandler({
            CallApplicationService.InvalidCallOperationException.class,
            TranscriptApplicationService.InvalidTranscriptException.class
    })
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiError conflict(RuntimeException exception) {
        return error(HttpStatus.CONFLICT, exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiError validation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getField() + " " + error.getDefaultMessage())
                .orElse("invalid request");
        return error(HttpStatus.BAD_REQUEST, message);
    }

    private ApiError error(HttpStatus status, String message) {
        return new ApiError(status.value(), status.getReasonPhrase(), message, Instant.now());
    }

    public record ApiError(int status, String error, String message, Instant timestamp) {
    }
}
