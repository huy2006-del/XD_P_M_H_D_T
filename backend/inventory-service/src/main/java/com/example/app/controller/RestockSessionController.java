package com.example.app.controller;

import com.example.app.dto.RestockSessionDto;
import com.example.app.service.RestockSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/restock-sessions")
@RequiredArgsConstructor
public class RestockSessionController {

    private final RestockSessionService restockSessionService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public RestockSessionDto.SessionResponse createSession(
            @Valid @RequestBody RestockSessionDto.CreateSessionRequest request) {
        return restockSessionService.createSession(request);
    }

    @PostMapping("/{id}/items")
    public RestockSessionDto.SessionResponse addItem(
            @PathVariable Long id,
            @Valid @RequestBody RestockSessionDto.AddItemRequest request) {
        return restockSessionService.addItem(id, request);
    }

    @PostMapping("/{id}/complete")
    public RestockSessionDto.SessionResponse completeSession(@PathVariable Long id) {
        return restockSessionService.completeSession(id);
    }

    @GetMapping("/machine/{machineId}")
    public List<RestockSessionDto.SessionResponse> getByMachine(@PathVariable Long machineId) {
        return restockSessionService.getSessionsByMachine(machineId);
    }

    @GetMapping
    public List<RestockSessionDto.SessionResponse> getSessions() {
        return restockSessionService.getSessions();
    }
}
