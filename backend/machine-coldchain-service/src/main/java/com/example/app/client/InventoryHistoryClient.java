package com.example.app.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "inventory-service")
public interface InventoryHistoryClient {

    @GetMapping("/internal/api/v1/slots/{slotId}/has-history")
    boolean hasHistory(@PathVariable("slotId") Long slotId);
}
