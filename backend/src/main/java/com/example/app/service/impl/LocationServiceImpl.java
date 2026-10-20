package com.example.app.service.impl;

import com.example.app.dto.request.LocationRequest;
import com.example.app.dto.response.LocationResponse;
import com.example.app.entity.Location;
import com.example.app.repository.LocationRepository;
import com.example.app.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LocationServiceImpl implements LocationService {

    private final LocationRepository locationRepository;

    @Override
    @Transactional(readOnly = true)
    public List<LocationResponse> getAll() {
        return locationRepository.findAll().stream().map(LocationResponse::from).toList();
    }

    @Override
    @Transactional
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
