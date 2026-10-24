
import type { MachineSlot } from "../slotTypes";
import SlotCard from "./SlotCard";

type Props = {
  slots: MachineSlot[];
  onConfigure: (slot: MachineSlot) => void;
};

export default function MachineSlotGrid({ slots, onConfigure }: Props) {
  const floors = slots.reduce<Record<string, MachineSlot[]>>(
    (result, slot) => {
      const floor = slot.slotCode.charAt(0).toUpperCase();

      if (!result[floor]) {
        result[floor] = [];
      }

      result[floor].push(slot);
      return result;
    },
    {}
  );

  if (slots.length === 0) {
    return (
      <p className="fv-slot-empty">
        Máy này chưa được cấu hình khay hàng.
      </p>
    );
  }

  return (
    <div className="fv-slot-machine">
      {Object.entries(floors)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([floor, floorSlots]) => (
          <section className="fv-slot-floor" key={floor}>
            <h2>Tầng {floor}</h2>

            <div className="fv-slot-grid">
              {floorSlots
                .sort((a, b) =>
                  a.slotCode.localeCompare(
                    b.slotCode,
                    undefined,
                    { numeric: true }
                  )
                )
                .map((slot) => (
                  <SlotCard
                    key={slot.slotId}
                    slot={slot}
                    onConfigure={onConfigure}
                    />
                ))}
            </div>
          </section>
        ))}
    </div>
  );
}
