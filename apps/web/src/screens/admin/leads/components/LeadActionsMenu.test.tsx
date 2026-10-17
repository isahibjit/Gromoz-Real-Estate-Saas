import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { api } from "../../../../common/api";
import { LeadActionsMenu } from "./LeadActionsMenu";

jest.mock("../../../../common/api", () => ({
  api: { post: jest.fn() },
}));

const post = api.post as jest.Mock;

function renderMenu() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter>
        <LeadActionsMenu
          lead={{
            id: "lead-1",
            name: "Rahul Sharma",
            mobile: "+91 98700 66177",
            requirement: "2 BHK, Andheri",
          }}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => post.mockResolvedValue({ data: {} }));

test("renders the standardized lead actions without call or email", async () => {
  const user = userEvent.setup();
  renderMenu();

  await user.click(screen.getByRole("button", { name: "Open actions for Rahul Sharma" }));

  expect(screen.getByText("View")).toBeInTheDocument();
  expect(screen.getByText("Edit")).toBeInTheDocument();
  expect(screen.getByText("Create Follow-Up")).toBeInTheDocument();
  expect(screen.getByText("Assign")).toBeInTheDocument();
  expect(screen.getByText("Delete")).toBeInTheDocument();
  expect(screen.queryByText("Call")).not.toBeInTheDocument();
  expect(screen.queryByText("Email")).not.toBeInTheDocument();
});

test("creates a persisted follow-up for the selected lead", async () => {
  const user = userEvent.setup();
  renderMenu();

  await user.click(screen.getByRole("button", { name: "Open actions for Rahul Sharma" }));
  await user.click(screen.getByText("Create Follow-Up"));
  fireEvent.change(screen.getByLabelText("Follow-up date"), { target: { value: "2026-06-25" } });
  await user.type(screen.getByLabelText("Next action"), "Share updated inventory");
  await user.click(screen.getByRole("button", { name: "Create Follow-Up" }));

  expect(post).toHaveBeenCalledWith(
    "/leads/lead-1/follow-ups",
    expect.objectContaining({ followUpType: "Call", nextAction: "Share updated inventory" }),
  );
});
