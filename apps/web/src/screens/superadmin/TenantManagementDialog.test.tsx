import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../../common/api";
import { TenantManagementDialog } from "./TenantManagementDialog";

jest.mock("../../common/api", () => ({
  api: { patch: jest.fn(), post: jest.fn() },
}));

const tenant = {
  id: "tenant-a",
  name: "Cedar Realty",
  slug: "cedar",
  planTier: "STARTER",
  allocatedSeats: 5,
  setupFeePaid: false,
  memberships: [
    {
      isOwner: true,
      isActive: true,
      role: "ADMIN",
      user: { fullName: "Cedar Admin", email: "admin@cedar.example" },
    },
  ],
};

beforeEach(() => jest.resetAllMocks());

test("saves workspace and administrator details through the existing API", async () => {
  jest.mocked(api.patch).mockResolvedValue({ data: { success: true } });
  const onSaved = jest.fn();
  render(<TenantManagementDialog tenant={tenant} onClose={jest.fn()} onSaved={onSaved} />);

  fireEvent.change(screen.getByLabelText("Workspace name"), {
    target: { value: "Cedar Homes" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(api.patch).toHaveBeenCalledWith(
    "/organizations/tenants/tenant-a",
    expect.objectContaining({ name: "Cedar Homes", adminEmail: "admin@cedar.example" }),
  );
  expect(screen.getByRole("status")).toHaveTextContent("details saved");
});

test("keeps the notification checkbox and password action on separate rows", async () => {
  render(<TenantManagementDialog tenant={tenant} onClose={jest.fn()} onSaved={jest.fn()} />);
  await userEvent.click(screen.getByRole("tab", { name: "Password" }));
  const checkbox = screen.getByLabelText("Email the updated credentials to the administrator");
  const checkboxLabel = checkbox.closest("label");
  const button = screen.getByRole("button", { name: "Update administrator password" });
  expect(checkboxLabel).toHaveClass("flex", "w-full");
  expect(checkboxLabel?.parentElement?.nextElementSibling).toBe(button);
});
