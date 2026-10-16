import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAppSelector } from "../../../store";
import { usePermission } from "../../../common/access/usePermission";
import { HrPayrollPanel } from "./HrPayrollPanel";

jest.mock("../../../store", () => ({ useAppSelector: jest.fn() }));
jest.mock("../../../common/access/usePermission", () => ({ usePermission: jest.fn() }));
jest.mock("./PayrollSettingsModal", () => ({ PayrollSettingsModal: () => null }));

function renderPayroll(role: string, canCreate: boolean, canUpdate: boolean) {
  jest.mocked(useAppSelector).mockReturnValue({ role });
  jest.mocked(usePermission).mockReturnValue({
    canView: true, canCreate, canUpdate, canDelete: false,
    canPunchIn: false, canPunchOut: false,
  });
  render(<MemoryRouter><HrPayrollPanel
    year={2026} month={10} setYear={jest.fn()} setMonth={jest.fn()}
    payrollRecords={[
      { id: "draft", employeeId: "self", employee: { fullName: "Example Employee" }, status: "Draft", netPay: 10000, month: 10, year: 2026 },
      { id: "finalized", employeeId: "self", employee: { fullName: "Example Employee" }, status: "Finalized", netPay: 10000, month: 10, year: 2026 },
    ]}
    employees={[]} isLoading={false} mutations={{ runPayroll: { isPending: false } }}
  /></MemoryRouter>);
}

test.each(["SALES_AGENT", "TELECALLER"])("%s can read payroll without administrative controls", (role) => {
  renderPayroll(role, true, true);
  expect(screen.getAllByText("Example Employee").length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: "Settings" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Run Payroll" })).not.toBeInTheDocument();
  expect(screen.queryByTitle("Finalize")).not.toBeInTheDocument();
  expect(screen.queryByTitle("Mark as Paid")).not.toBeInTheDocument();
});

test("view-only payroll administrators do not see processing controls", () => {
  renderPayroll("HR", false, false);
  expect(screen.queryByRole("button", { name: "Settings" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Run Payroll" })).not.toBeInTheDocument();
  expect(screen.queryByTitle("Finalize")).not.toBeInTheDocument();
});

test("authorized payroll administrators retain processing controls", () => {
  renderPayroll("HR", true, true);
  expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Run Payroll" })).toBeInTheDocument();
  expect(screen.getByTitle("Finalize")).toBeInTheDocument();
  expect(screen.getByTitle("Mark as Paid")).toBeInTheDocument();
});
