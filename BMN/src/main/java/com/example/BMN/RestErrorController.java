package com.example.BMN;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.error.ErrorAttributeOptions;
import org.springframework.boot.web.servlet.error.ErrorAttributes;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.context.request.ServletWebRequest;

import java.util.HashMap;
import java.util.Map;

/**
 * Override default /error handling to always return JSON.
 * This prevents the server from returning an HTML error page when the client
 * Accept header prefers text/html.
 */
@Controller
public class RestErrorController implements ErrorController {

    private final ErrorAttributes errorAttributes;

    public RestErrorController(ErrorAttributes errorAttributes) {
        this.errorAttributes = errorAttributes;
    }

    @RequestMapping(value = "/error", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> error(HttpServletRequest request) {
        ServletWebRequest webRequest = new ServletWebRequest(request);
        ErrorAttributeOptions opts = ErrorAttributeOptions.defaults()
                .including(ErrorAttributeOptions.Include.MESSAGE, ErrorAttributeOptions.Include.BINDING_ERRORS);
        Map<String, Object> attrs = this.errorAttributes.getErrorAttributes(webRequest, opts);

        Map<String, Object> body = new HashMap<>();
        Object status = attrs.getOrDefault("status", 500);
        body.put("status", status);
        body.put("message", attrs.getOrDefault("message", "error"));
        body.put("path", attrs.getOrDefault("path", request.getRequestURI()));
        body.put("timestamp", attrs.getOrDefault("timestamp", ""));

        return ResponseEntity.status(((Number) status).intValue()).contentType(MediaType.APPLICATION_JSON).body(body);
    }
}
