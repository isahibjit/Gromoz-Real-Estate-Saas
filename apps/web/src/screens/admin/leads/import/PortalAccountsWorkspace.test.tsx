import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { PortalAccountsWorkspace } from "./PortalAccountsWorkspace";
import { api } from "../../../../common/api";

jest.mock("../../../../common/api", () => ({
  api: { get: jest.fn(), patch: jest.fn() },
}));
jest.mock("../../dashboard/DashboardSidebar", () => ({
  DashboardSidebar: () => null,
}));
jest.mock("../all/useAllLeads", () => ({
  useLeadListFilterOptions: () => ({
    options: {
      projectOptions: [],
      teamOptions: [],
      ownerOptions: [
        { value: "rajesh", label: "Rajesh Maurya", role: "SUPER_ADMIN" },
      ],
    },
  }),
}));
jest.mock("ui", () => ({
  ...jest.requireActual("ui"),
  SearchableSelect: ({
    value,
    onValueChange,
    options,
    placeholder,
    ariaLabel,
  }: {
    value: string;
    onValueChange: (id: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder: string;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel ?? placeholder}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));
const primary = {
  id: "primary",
  name: "Primary account",
  provider: "magicbricks",
  isPrimary: true,
  isActive: true,
  status: "Connected",
  fieldMapping: {},
  totalLeadsReceived: 0,
  leadCount: 0,
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.patch).mockResolvedValue({ data: {} });
});
async function openRouting(
  routing: { ownerId?: string } | null = null,
  second = false,
) {
  jest.mocked(api.get).mockResolvedValue({
    data: {
      data: {
        accounts: [
          { ...primary, routing },
          ...(second
            ? [
                {
                  ...primary,
                  id: "second",
                  name: "Second account",
                  isPrimary: false,
                  routing: null,
                },
              ]
            : []),
        ],
        summary: {
          status: "Connected",
          activeCount: 1,
          totalCount: 1,
          totalLeadsReceived: 0,
          archivedCount: 0,
        },
      },
    },
  });
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <PortalAccountsWorkspace provider="magicbricks" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await userEvent.click(await screen.findByRole("tab", { name: "Routing" }));
}
test("defaults to no person/team route with an explicit unassigned explanation", async () => {
  await openRouting();
  expect(
    screen.getByRole("combobox", {
      name: "Person override",
    }),
  ).toHaveValue("");
  expect(
    screen.getByText(/Without a person or team route, leads remain unassigned/),
  ).toBeInTheDocument();
});
test("loads the saved management owner and sends only its canonical assignment field", async () => {
  await openRouting({ ownerId: "rajesh" });
  expect(
    screen.getByRole("combobox", {
      name: "Person override",
    }),
  ).toHaveValue("rajesh");
  await userEvent.click(screen.getByRole("button", { name: "Save routing" }));
  await waitFor(() =>
    expect(api.patch).toHaveBeenCalledWith(
      "/integrations/magicbricks/accounts/primary/routing",
      {
        projectId: null,
        teamId: null,
        ownerId: "rajesh",
        telecallerId: "",
        fieldExecutiveId: "",
      },
    ),
  );
});
test("clearing a saved person clears all assignment fields", async () => {
  await openRouting({ ownerId: "rajesh" });
  fireEvent.change(
    screen.getByRole("combobox", {
      name: "Person override",
    }),
    { target: { value: "" } },
  );
  await userEvent.click(screen.getByRole("button", { name: "Save routing" }));
  await waitFor(() =>
    expect(api.patch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        ownerId: "",
        telecallerId: "",
        fieldExecutiveId: "",
      }),
    ),
  );
});
test("switching accounts does not copy the previous account's person route", async () => {
  await openRouting({ ownerId: "rajesh" }, true);
  await userEvent.click(screen.getByRole("button", { name: /Second account/ }));
  await userEvent.click(screen.getByRole("tab", { name: "Routing" }));
  expect(
    screen.getByRole("combobox", {
      name: "Person override",
    }),
  ).toHaveValue("");
});

test("does not silently clear an existing owner while its selectable option is unavailable", async () => {
  await openRouting({ ownerId: "unavailable-owner" });
  await userEvent.click(screen.getByRole("button", { name: "Save routing" }));
  expect(api.patch).not.toHaveBeenCalled();
});
