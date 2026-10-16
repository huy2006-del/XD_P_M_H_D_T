package com.example.app;

import com.example.app.entity.Location;
import com.example.app.entity.Operator;
import com.example.app.repository.LocationRepository;
import com.example.app.repository.OperatorRepository;
import com.example.app.repository.VendingMachineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private VendingMachineRepository machineRepository;

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private OperatorRepository operatorRepository;

    private Location location;
    private Operator operator;

    @BeforeEach
    void setUp() {
        machineRepository.deleteAll();
        locationRepository.deleteAll();
        operatorRepository.deleteAll();
        location = locationRepository.save(new Location(
                "Sảnh A - Tòa Landmark 81",
                "720A Điện Biên Phủ, P.22, Bình Thạnh",
                "TP. Hồ Chí Minh",
                10.7951,
                106.7218
        ));
        operator = operatorRepository.save(new Operator("Nguyễn Văn Vận Hành"));
    }

    @Test
    void createsMachineReturnsRelatedLocationAndOperatorAndFiltersByStatus() throws Exception {
        String request = """
                {
                  "serialNumber": "FV-HCM-001",
                  "name": "FreshVend Kiosk #01",
                  "locationId": %d,
                  "operatorId": %d
                }
                """.formatted(location.getId(), operator.getId());

        mockMvc.perform(post("/api/v1/machines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.serialNumber").value("FV-HCM-001"))
                .andExpect(jsonPath("$.status").value("ONLINE"))
                .andExpect(jsonPath("$.location.id").value(location.getId()))
                .andExpect(jsonPath("$.location.name").value("Sảnh A - Tòa Landmark 81"))
                .andExpect(jsonPath("$.operator.id").value(operator.getId()))
                .andExpect(jsonPath("$.operator.fullName").value("Nguyễn Văn Vận Hành"));

        mockMvc.perform(get("/api/v1/machines").param("status", "ONLINE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        mockMvc.perform(get("/api/v1/machines").param("status", "ERROR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        mockMvc.perform(get("/api/v1/machines").param("locationId", location.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        Long machineId = machineRepository.findAll().get(0).getId();
        mockMvc.perform(get("/api/v1/machines/{id}", machineId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.location.address").value("720A Điện Biên Phủ, P.22, Bình Thạnh"));
    }

    @Test
    void createsAndListsLocations() throws Exception {
        mockMvc.perform(post("/api/v1/locations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name": "Tòa nhà Bitexco - Tầng 1",
                                  "address": "2 Hải Triều, Bến Nghé, Quận 1",
                                  "city": "TP. Hồ Chí Minh",
                                  "latitude": 10.7717,
                                  "longitude": 106.7042
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Tòa nhà Bitexco - Tầng 1"))
                .andExpect(jsonPath("$.latitude").value(10.7717));

        mockMvc.perform(get("/api/v1/locations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)));
    }

    @Test
    void rejectsDuplicateSerialNumberAndUnknownMachine() throws Exception {
        String request = """
                {
                  "serialNumber": "FV-HCM-001",
                  "name": "FreshVend Kiosk #01",
                  "locationId": %d,
                  "operatorId": %d
                }
                """.formatted(location.getId(), operator.getId());
        mockMvc.perform(post("/api/v1/machines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/machines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isConflict());

        mockMvc.perform(get("/api/v1/machines/9999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void updatesMachineAndManualStatus() throws Exception {
        String createRequest = """
                {
                  "serialNumber": "FV-HCM-001",
                  "name": "FreshVend Kiosk #01",
                  "locationId": %d,
                  "operatorId": %d
                }
                """.formatted(location.getId(), operator.getId());
        mockMvc.perform(post("/api/v1/machines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createRequest))
                .andExpect(status().isCreated());

        Long machineId = machineRepository.findAll().get(0).getId();
        Location newLocation = locationRepository.save(new Location(
                "Tòa nhà Bitexco - Tầng 1",
                "2 Hải Triều, Bến Nghé, Quận 1",
                "TP. Hồ Chí Minh",
                10.7717,
                106.7042
        ));
        Operator newOperator = operatorRepository.save(new Operator("Trần Thị Vận Hành"));
        String updateRequest = """
                {
                  "serialNumber": "FV-HCM-001",
                  "name": "FreshVend Kiosk Updated",
                  "model": "FV-X1",
                  "locationId": %d,
                  "operatorId": %d
                }
                """.formatted(newLocation.getId(), newOperator.getId());

        mockMvc.perform(put("/api/v1/machines/{id}", machineId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateRequest))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("FreshVend Kiosk Updated"))
                .andExpect(jsonPath("$.model").value("FV-X1"))
                .andExpect(jsonPath("$.location.id").value(newLocation.getId()))
                .andExpect(jsonPath("$.operator.fullName").value("Trần Thị Vận Hành"));

        mockMvc.perform(patch("/api/v1/machines/{id}/status", machineId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"MAINTENANCE"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("MAINTENANCE"));
    }
}
