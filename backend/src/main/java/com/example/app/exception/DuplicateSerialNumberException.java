package com.example.app.exception;

public class DuplicateSerialNumberException extends RuntimeException {
    public DuplicateSerialNumberException(String serialNumber) {
        super("Machine serial number already exists: " + serialNumber);
    }
}
