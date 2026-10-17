import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { api } from "../../../common/api";
import { defaultLoginPageCms } from "./LoginPageCmsModal";
import { WorkspaceSettingsPage } from "./WorkspaceSettingsPage";

jest.mock("../../../common/api", () => ({
  api: { get: jest.fn(), patch: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.get).mockResolvedValue({
    data: {
      profile: { companyName: "Cedar Realty", logoUrl: "/workspace-logo.png" },
      loginCms: {
        ...defaultLoginPageCms,
        heroHeadlineHighlight: "Cedar portal",
        heroLogoUrl: "/portal-logo.png",
      },
    },
  });
});

test("loads saved CMS content in both previews and discards cancelled drafts", async () => {
  render(
    <MemoryRouter initialEntries={["/admin/settings/workspace?tab=login-cms"]}>
      <WorkspaceSettingsPage />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("heading", { name: "Welcome to Cedar portal" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Brand Logo" })).toHaveAttribute(
    "src",
    "/portal-logo.png",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Edit login page" }),
  );
  const editor = screen.getByRole("dialog");
  const headline = within(editor).getByRole("textbox", {
    name: "Company Name Highlight",
  });
  expect(headline).toHaveValue("Cedar portal");
  await userEvent.clear(headline);
  await userEvent.type(headline, "Draft welcome");
  expect(
    within(editor).getByRole("heading", { name: "Welcome to Draft welcome" }),
  ).toBeInTheDocument();
  await userEvent.click(within(editor).getByRole("button", { name: "Form & App" }));
  await userEvent.click(within(editor).getByRole("checkbox", { name: "Show Mobile App Download Button" }));
  expect(within(editor).queryByRole("button", { name: "Download Android app" })).not.toBeInTheDocument();
  await userEvent.click(within(editor).getByRole("button", { name: "Cancel" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(
    screen.getByRole("heading", { name: "Welcome to Cedar portal" }),
  ).toBeInTheDocument();
  expect(api.patch).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole("button", { name: "Edit login page" }),
  );
  expect(
    within(screen.getByRole("dialog")).getByRole("textbox", {
      name: "Company Name Highlight",
    }),
  ).toHaveValue("Cedar portal");
});

test("uses the workspace logo when the CMS has no custom logo", async () => {
  jest.mocked(api.get).mockResolvedValue({
    data: {
      profile: { companyName: "Cedar Realty", logoUrl: "/workspace-logo.png" },
      loginCms: { ...defaultLoginPageCms, heroLogoUrl: "" },
    },
  });
  render(
    <MemoryRouter initialEntries={["/admin/settings?tab=login-cms"]}>
      <WorkspaceSettingsPage />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole("img", { name: "Brand Logo" }),
  ).toHaveAttribute("src", "/workspace-logo.png");
});
