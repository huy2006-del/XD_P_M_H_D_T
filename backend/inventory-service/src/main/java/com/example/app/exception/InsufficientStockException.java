package com.example.app.exception;

public class InsufficientStockException extends RuntimeException {
    public InsufficientStockException(Long slotId, int requested, long available) {
        super("Slot " + slotId + " has only " + available + " sellable items, requested " + requested);
    }
}
