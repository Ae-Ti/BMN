package com.example.BMN;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Simple health endpoint to ensure a clean JSON response is available at
 * /actuator/health even if the actuator configuration is restricted.
 * This is intentionally minimal and returns {"status":"UP"}.
 */
@RestController
public class WebHealthController {

    @GetMapping("/actuator/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }
}
