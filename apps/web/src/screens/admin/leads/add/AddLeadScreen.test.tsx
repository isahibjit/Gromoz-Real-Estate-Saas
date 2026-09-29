import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { makeStore } from "../../../../store";
import { setCredentials } from "../../../../store/slices/authSlice";
import { AddLeadScreen } from "./AddLeadScreen";

let consoleWarnSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    configurable: true,
    value: jest.fn(() => false),
  });
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: jest.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    configurable: true,
    value: jest.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: jest.fn(),
  });
});

function renderAddLead() {
  const store = makeStore();
  store.dispatch(
    setCredentials({
      accessToken: "access-token",
      user: {
        id: "user-1",
        email: "admin@truroot.com",
        role: "ADMIN",
        fullName: "Admin User",
      },
    }),
  );

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/leads/add"]}>
        <AddLeadScreen />
      </MemoryRouter>
    </Provider>,
  );
}

beforeEach(() => {
  consoleWarnSpy = jest
    .spyOn(console, "warn")
    .mockImplementation(() => undefined);
  consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
});

afterEach(() => {
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

async function selectOption(label: string, option: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: label }));
  await user.click(screen.getByRole("option", { name: option }));
}

test("renders add lead shell, form sections, right rail cards, and active sidebar item", () => {
  renderAddLead();

  expect(
    screen.getAllByRole("heading", { name: "Add New Lead" }).length,
  ).toBeGreaterThan(0);
  expect(
    screen.getByRole("button", { name: "Lead Management" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Basic Information")).toBeInTheDocument();
  expect(screen.getByText("Property Requirements")).toBeInTheDocument();
  expect(screen.getAllByText("Lead Information").length).toBeGreaterThan(0);
  expect(screen.getByText("Assignment")).toBeInTheDocument();
  expect(screen.getByText("Recommended Projects")).toBeInTheDocument();
  expect(screen.getByText("Lead Summary")).toBeInTheDocument();
  expect(screen.getByText("Quick Actions")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Lead Management" }),
  ).toHaveAttribute("aria-expanded", "true");
  expect(
    screen.getByLabelText("Search leads, customers, projects"),
  ).toBeInTheDocument();
});

test("save lead validates required fields", async () => {
  const user = userEvent.setup();
  renderAddLead();

  await user.click(screen.getByRole("button", { name: "Save Lead" }));

  expect(screen.getByText("Lead name is required.")).toBeInTheDocument();
  expect(screen.getByText("Mobile number is required.")).toBeInTheDocument();
  expect(screen.getByText("Property type is required.")).toBeInTheDocument();
  expect(screen.getByText("Lead source is required.")).toBeInTheDocument();
});

test("save as draft allows partial state without validation errors", async () => {
  const user = userEvent.setup();
  renderAddLead();

  await user.type(screen.getByLabelText("Lead Name"), "Rohit Sharma");
  await user.click(screen.getByRole("button", { name: "Save as Draft" }));

  expect(
    screen.getByText(
      "Draft saved locally. Connect this action to the lead draft API when available.",
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText("Lead name is required.")).not.toBeInTheDocument();
});

test("save and assign validates follow-up type in addition to required fields", async () => {
  const user = userEvent.setup();
  renderAddLead();

  await user.type(screen.getByLabelText("Lead Name"), "Rohit Sharma");
  await user.type(screen.getByLabelText("Mobile Number"), "9876543210");
  await selectOption("Property Type", "Apartment");
  await user.type(screen.getByLabelText("Min Budget"), "5000000");
  await user.type(screen.getByLabelText("Max Budget"), "10000000");
  await selectOption("Preferred Location", "Andheri East, Mumbai");
  await selectOption("Lead Source", "MagicBricks");

  await user.click(screen.getByRole("button", { name: "Save & Assign" }));

  expect(
    screen.getByText("Follow-up type is required for assignment."),
  ).toBeInTheDocument();
});

test("form controls bind to state and cancel resets edited fields", async () => {
  const user = userEvent.setup();
  renderAddLead();

  await user.type(screen.getByLabelText("Lead Name"), "Rohit Sharma");
  await user.type(screen.getByLabelText("Mobile Number"), "9876543210");
  await user.type(screen.getByLabelText("Remarks / Notes"), "Serious buyer");
  await selectOption("Lead Source", "Google Ads");

  expect(
    screen.getByRole("combobox", { name: "Lead Source" }),
  ).toHaveTextContent("Google Ads");
  expect(screen.getByLabelText("Remarks / Notes")).toHaveValue("Serious buyer");

  await user.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.getByLabelText("Lead Name")).toHaveValue("");
  expect(screen.getByLabelText("Mobile Number")).toHaveValue("");
  expect(
    screen.getByRole("combobox", { name: "Lead Source" }),
  ).toHaveTextContent("Select lead source");
  expect(screen.getByLabelText("Remarks / Notes")).toHaveValue("");
});

test("quick actions render and show the placeholder status handler", async () => {
  const user = userEvent.setup();
  renderAddLead();

  await user.click(screen.getByRole("button", { name: /Send WhatsApp/i }));

  expect(
    screen.getByText(
      'Quick action "whatsapp" is wired as a UI placeholder. Connect it to the existing modal or route when available.',
    ),
  ).toBeInTheDocument();
});
