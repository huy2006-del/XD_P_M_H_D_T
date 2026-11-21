package com.example.app.repository;

public interface MachineTemperatureCompliance {
    Long getMachineId();

    Long getTotalPings();

    Long getInRangePings();
}
