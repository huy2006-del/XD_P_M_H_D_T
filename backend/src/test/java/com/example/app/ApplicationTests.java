package com.example.app;

import com.example.app.entity.Location;
import com.example.app.entity.MachineSlot;
import com.example.app.entity.Operator;
import com.example.app.entity.Product;
import com.example.app.repository.MachineSlotRepository;
import com.example.app.repository.LocationRepository;
import com.example.app.repository.OperatorRepository;
import com.example.app.repository.ProductRepository;
import com.example.app.repository.TemperatureLogRepository;
import com.example.app.repository.VendingMachineRepository;
import com.example.app.service.TelemetryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

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
    private MachineSlotRepository machineSlotRepository;

    @Autowired
    private TemperatureLogRepository temperatureLogRepository;

    @Autowired
    private TelemetryService telemetryService;

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OperatorRepository operatorRepository;

    private Location location;
    private Operator operator;

    @BeforeEach
    void setUp() {
        temperatureLogRepository.deleteAll();
        machineSlotRepository.deleteAll();
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

    @Test
    void createsListsUpdatesAndDeletesMachineSlots() throws Exception {
        Long machineId = createMachine();
        Product product = productRepository.save(new Product(
                "Táo Envy",
                "SLOT-" + System.nanoTime(),
                new BigDecimal("55000"),
                "quả",
                "https://example.test/apple.png",
                10,
                new BigDecimal("2.00"),
                new BigDecimal("8.00"),
                "Táo tươi"
        ));

        mockMvc.perform(post("/api/v1/machines/{machineId}/slots", machineId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "slotCode": "A1",
                                  "productId": %d,
                                  "capacity": 10
                                }
                                """.formatted(product.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.slotCode").value("A1"))
                .andExpect(jsonPath("$.currentStock").value(0))
                .andExpect(jsonPath("$.status").value("EMPTY"))
                .andExpect(jsonPath("$.productName").value("Táo Envy"))
                .andExpect(jsonPath("$.productPrice").value(55000));

        Long slotId = machineSlotRepository.findAll().get(0).getId();
        mockMvc.perform(get("/api/v1/machines/{machineId}/slots", machineId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].productImageUrl").value("https://example.test/apple.png"));

        mockMvc.perform(patch("/api/v1/slots/{slotId}/status", slotId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"JAMMED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("JAMMED"));

        mockMvc.perform(put("/api/v1/slots/{slotId}", slotId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "slotCode": "B1",
                                  "capacity": 12
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slotCode").value("B1"))
                .andExpect(jsonPath("$.capacity").value(12))
                .andExpect(jsonPath("$.productId").doesNotExist());

        mockMvc.perform(patch("/api/v1/slots/{slotId}/status", slotId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"EMPTY"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("EMPTY"));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/v1/slots/{slotId}", slotId))
                .andExpect(status().isNoContent());
    }

    @Test
    void recordsTemperatureSpikeReturnsLatestAndHistoryAndTogglesPower() throws Exception {
        Long machineId = createMachine();

        mockMvc.perform(post("/api/v1/simulator/machines/{machineId}/temp-spike", machineId)
                        .param("temp", "13.5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temperature").value(13.5))
                .andExpect(jsonPath("$.humidity").value(85.0));

        mockMvc.perform(get("/api/v1/machines/{machineId}/telemetry/latest", machineId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.temperature").value(13.5));

        mockMvc.perform(get("/api/v1/machines/{machineId}/telemetry/history", machineId)
                        .param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)));

        mockMvc.perform(get("/api/v1/machines/{id}", machineId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tempMinThreshold").value(2.0))
                .andExpect(jsonPath("$.tempMaxThreshold").value(8.0))
                .andExpect(jsonPath("$.currentTemp").value(13.5));

        mockMvc.perform(post("/api/v1/simulator/machines/{machineId}/toggle-power", machineId))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/machines/{id}", machineId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OFFLINE"));
        mockMvc.perform(post("/api/v1/simulator/machines/{machineId}/toggle-power", machineId))
                .andExpect(status().isNoContent());
    }

    @Test
    void simulatorRecordsReadingsInConfiguredRangesAndUpdatesHeartbeat() {
        Long machineId = machineRepository.save(new com.example.app.entity.VendingMachine(
                "FV-HCM-" + System.nanoTime(),
                "FreshVend Kiosk",
                null,
                location,
                operator
        )).getId();

        telemetryService.captureOnlineMachines();

        var latest = temperatureLogRepository.findTopByMachineIdOrderByRecordedAtDescIdDesc(machineId)
                .orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(latest.getTemperature() >= 3.5);
        org.junit.jupiter.api.Assertions.assertTrue(latest.getTemperature() <= 6.5);
        org.junit.jupiter.api.Assertions.assertTrue(latest.getHumidity() >= 80.0);
        org.junit.jupiter.api.Assertions.assertTrue(latest.getHumidity() <= 90.0);
        org.junit.jupiter.api.Assertions.assertNotNull(machineRepository.findById(machineId).orElseThrow().getLastPingAt());
    }

    private Long createMachine() throws Exception {
        String request = """
                {
                  "serialNumber": "FV-HCM-%d",
                  "name": "FreshVend Kiosk",
                  "locationId": %d,
                  "operatorId": %d
                }
                """.formatted(System.nanoTime(), location.getId(), operator.getId());
        mockMvc.perform(post("/api/v1/machines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated());
        return machineRepository.findAll().get(0).getId();
    }
}
