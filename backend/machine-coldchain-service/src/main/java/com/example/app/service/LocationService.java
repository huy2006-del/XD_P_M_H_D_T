package com.example.app.service;

import com.example.app.dto.request.LocationRequest;
import com.example.app.dto.response.LocationResponse;

import java.util.List;

public interface LocationService {
    List<LocationResponse> getAll();

    LocationResponse create(LocationRequest request);
}
