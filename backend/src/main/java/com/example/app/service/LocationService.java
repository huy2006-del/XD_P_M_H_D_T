package com.example.app.service;

import com.example.app.dto.LocationRequest;
import com.example.app.dto.LocationResponse;
import com.example.app.entity.Location;
import com.example.app.repository.LocationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class LocationService {

    private final LocationRepository locationRepository;

    public LocationService(LocationRepository locationRepository) {
        this.locationRepository = locationRepository;
    }

    @Transactional(readOnly = true)
    public List<LocationResponse> getAll() {
        return locationRepository.findAll().stream().map(LocationResponse::from).toList();
    }

    public LocationResponse create(LocationRequest request) {
        Location location = new Location(
                request.name(),
                request.address(),
                request.city(),
                request.latitude(),
                request.longitude()
        );
        return LocationResponse.from(locationRepository.save(location));
    }
}
