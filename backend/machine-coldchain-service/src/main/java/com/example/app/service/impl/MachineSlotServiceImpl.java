package com.example.app.service.impl;

import com.example.app.dto.request.MachineSlotRequest;
import com.example.app.dto.request.MachineSlotStatusRequest;
import com.example.app.dto.response.MachineSlotResponse;
import com.example.app.client.ProductClient;
import com.example.app.client.InventoryHistoryClient;
import com.example.app.dto.ProductDTO;
import com.example.app.entity.MachineSlot;
import com.example.app.entity.VendingMachine;
import com.example.app.exception.BusinessRuleException;
import com.example.app.exception.ResourceNotFoundException;
import com.example.app.repository.MachineSlotRepository;
import com.example.app.repository.VendingMachineRepository;
import com.example.app.service.MachineSlotService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MachineSlotServiceImpl implements MachineSlotService {

    private final MachineSlotRepository machineSlotRepository;
    private final VendingMachineRepository vendingMachineRepository;
    private final ProductClient productClient;
    private final InventoryHistoryClient inventoryHistoryClient;

    @Override
    @Transactional(readOnly = true)
    public List<MachineSlotResponse> getMachineSlots(Long machineId) {
        if (!vendingMachineRepository.existsById(machineId)) {
            throw new ResourceNotFoundException("Không tìm thấy máy bán hàng có id: " + machineId);
        }
        return machineSlotRepository.findAllByMachineIdOrderBySlotCodeAsc(machineId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public MachineSlotResponse createMachineSlot(Long machineId, MachineSlotRequest request) {
        VendingMachine machine = vendingMachineRepository.findById(machineId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy máy bán hàng có id: " + machineId
                ));
        if (machineSlotRepository.existsByMachineIdAndSlotCodeIgnoreCase(machineId, request.slotCode().trim())) {
            throw new BusinessRuleException("Mã khay đã tồn tại trên máy này: " + request.slotCode());
        }
        ProductDTO product = findProduct(request.productId());
        MachineSlot slot = new MachineSlot(
                machine,
                request.slotCode().trim(),
                product == null ? null : Long.valueOf(product.id()),
                request.capacity() == null ? 10 : request.capacity()
        );
        return toResponse(machineSlotRepository.save(slot));
    }

    @Override
    @Transactional
    public MachineSlotResponse updateMachineSlot(Long slotId, MachineSlotRequest request) {
        MachineSlot slot = findSlot(slotId);
        if (machineSlotRepository.existsByMachineIdAndSlotCodeIgnoreCaseAndIdNot(
                slot.getMachine().getId(), request.slotCode().trim(), slotId
        )) {
            throw new BusinessRuleException("Mã khay đã tồn tại trên máy này: " + request.slotCode());
        }
        ProductDTO product = findProduct(request.productId());
        if (slot.getCurrentStock() > 0 && !sameProduct(slot.getProductId(), product)) {
            throw new BusinessRuleException("Không thể đổi sản phẩm khi khay còn tồn kho.");
        }
        int capacity = request.capacity() == null ? slot.getCapacity() : request.capacity();
        if (capacity < slot.getCurrentStock()) {
            throw new BusinessRuleException("Sức chứa không được nhỏ hơn tồn kho hiện tại.");
        }
        slot.updateConfiguration(
                request.slotCode().trim(),
                product == null ? null : Long.valueOf(product.id()),
                capacity
        );
        return toResponse(machineSlotRepository.save(slot));
    }

    @Override
    @Transactional
    public MachineSlotResponse updateMachineSlotStatus(Long slotId, MachineSlotStatusRequest request) {
        MachineSlot slot = findSlot(slotId);
        try {
            slot.changeStatus(request.status());
        } catch (IllegalArgumentException exception) {
            throw new BusinessRuleException(exception.getMessage());
        }
        return toResponse(machineSlotRepository.save(slot));
    }

    @Override
    @Transactional
    public void deleteMachineSlot(Long slotId) {
        MachineSlot slot = findSlot(slotId);
        if (slot.getCurrentStock() > 0 || inventoryHistoryClient.hasHistory(slotId)) {
            throw new BusinessRuleException("Không thể xóa khay đang có tồn kho hoặc lịch sử xuất nhập.");
        }
        machineSlotRepository.delete(slot);
    }

    private MachineSlot findSlot(Long slotId) {
        return machineSlotRepository.findById(slotId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khay hàng có id: " + slotId));
    }

    private ProductDTO findProduct(Long productId) {
        if (productId == null) {
            return null;
        }
        ProductDTO product = productClient.getById(productId);
        if (product == null || !product.isActive()) {
            throw new BusinessRuleException("Không thể gán sản phẩm đang ngừng kinh doanh vào khay.");
        }
        return product;
    }

    private boolean sameProduct(Long currentProductId, ProductDTO replacement) {
        return currentProductId == null ? replacement == null
                : replacement != null && currentProductId.equals(Long.valueOf(replacement.id()));
    }

    private MachineSlotResponse toResponse(MachineSlot slot) {
        ProductDTO product = slot.getProductId() == null ? null : productClient.getById(slot.getProductId());
        return MachineSlotResponse.from(slot, product);
    }
}
