package com.example.app.dto.response;

import com.example.app.entity.Location;

public record LocationResponse(
        Long id,
        String name,
        String address,
        String city,
        Double latitude,
        Double longitude
) {
    public static LocationResponse from(Location location) {
        return new LocationResponse(
                location.getId(),
                location.getName(),
                location.getAddress(),
                location.getCity(),
                location.getLatitude(),
                location.getLongitude()
        );
    }
}
