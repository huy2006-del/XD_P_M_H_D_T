import type { MachineSlot } from "../slotTypes";
import SlotCard from "./SlotCard";

type Props = {
  slots: MachineSlot[];
  onConfigure: (slot: MachineSlot) => void;
};

export default function MachineSlotGrid({ slots, onConfigure }: Props) {
  const groupedSlots = slots.reduce<Record<string, MachineSlot[]>>(
    (groups, slot) => {
      const floor = slot.slotCode.trim().charAt(0).toUpperCase() || "?";
      (groups[floor] ??= []).push(slot);
      return groups;
    },
    {}
  );

  if (slots.length === 0) {
    return <p className="fv-slot-empty">Máy chưa có khay hàng.</p>;
  }

  return (
    <div className="fv-slot-machine">
      {Object.entries(groupedSlots)
        .sort(([firstFloor], [secondFloor]) =>
          firstFloor.localeCompare(secondFloor, undefined, { numeric: true })
        )
        .map(([floor, floorSlots]) => (
          <section className="fv-slot-floor" key={floor}>
            <h2>Tầng {floor}</h2>
            <div className="fv-slot-grid">
              {floorSlots.map((slot) => (
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
