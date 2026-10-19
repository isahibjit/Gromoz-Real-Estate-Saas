import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
