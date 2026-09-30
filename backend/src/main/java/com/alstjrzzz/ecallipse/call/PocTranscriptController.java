package com.alstjrzzz.ecallipse.call;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class PocTranscriptController {
    private final TranscriptApplicationService transcripts;

    public PocTranscriptController(TranscriptApplicationService transcripts) {
        this.transcripts = transcripts;
    }

    @PostMapping("/poc/calls/{callId}/transcript")
    public TranscriptApplicationService.TranscriptResult submit(
            @PathVariable UUID callId,
            @Valid @RequestBody SubmitTranscriptRequest request
    ) {
        return transcripts.submit(callId, new TranscriptApplicationService.TranscriptInput(
                request.segmentId(),
                request.sequence(),
                request.revision(),
                request.speakerId(),
                request.text(),
                request.finalSegment()
        ));
    }

    @GetMapping("/calls/{callId}/transcript")
    public List<TranscriptSegment> list(@PathVariable UUID callId) {
        return transcripts.list(callId);
    }

    public record SubmitTranscriptRequest(
            @NotBlank String segmentId,
            @PositiveOrZero long sequence,
            @PositiveOrZero int revision,
            @NotBlank String speakerId,
            @NotBlank String text,
            boolean finalSegment
    ) {
    }
}
