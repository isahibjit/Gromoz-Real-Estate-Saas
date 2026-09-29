import {
  formatTimeForDisplay,
  scheduledInputToIso,
  scheduledValueToDateInput,
  scheduledValueToPickerTime,
} from "./time";

describe("follow-up scheduling", () => {
  it.each([
    ["09:15 AM", 9, 15],
    ["11:35 AM", 11, 35],
    ["05:05 PM", 17, 5],
    ["08:47 PM", 20, 47],
    ["12:00 AM", 0, 0],
    ["12:00 PM", 12, 0],
    ["11:59 PM", 23, 59],
  ])(
    "preserves selected time %s through API serialization",
    (time, hour, minute) => {
      const serialized = scheduledInputToIso("2026-09-10", time);
      expect(serialized).toBe(
        new Date(2026, 8, 10, hour, minute).toISOString(),
      );
      expect(serialized).toMatch(/Z$/);
      const apiValue = JSON.parse(
        JSON.stringify(new Date(serialized)),
      ) as string;
      expect(scheduledValueToDateInput(apiValue)).toBe("2026-09-10");
      expect(scheduledValueToPickerTime(apiValue)).toBe(time);
      expect(formatTimeForDisplay(apiValue)).toBe(time);
    },
  );

  it("supports 24-hour picker input", () => {
    expect(
      scheduledValueToPickerTime(scheduledInputToIso("2026-09-10", "17:05")),
    ).toBe("05:05 PM");
  });

  it.each([
    ["", "10:00 AM"],
    ["2026-09-10", ""],
    ["2026-02-30", "10:00 AM"],
    ["2026-09-10", "25:00"],
    ["2026-09-10", "10:60 AM"],
  ])("rejects invalid inputs %s %s", (date, time) => {
    expect(() => scheduledInputToIso(date, time)).toThrow(
      "Select a valid follow-up date and time",
    );
  });
});
