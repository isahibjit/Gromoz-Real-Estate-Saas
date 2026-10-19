import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { api } from "../../../common/api";
import toast from "react-hot-toast";
import { defaultLoginPageCms } from "./LoginPageCmsModal";
import { WorkspaceSettingsPage } from "./WorkspaceSettingsPage";

jest.mock("../../../common/api", () => ({
  api: { get: jest.fn(), patch: jest.fn() },
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
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

test("publishes only the login CMS and closes the editor after success", async () => {
  jest.mocked(api.patch).mockResolvedValue({ data: {} });
  render(
    <MemoryRouter initialEntries={["/admin/settings/workspace?tab=login-cms"]}>
      <WorkspaceSettingsPage />
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "Welcome to Cedar portal" });
  await userEvent.click(screen.getByRole("button", { name: "Edit login page" }));
  const editor = screen.getByRole("dialog");
  const headline = within(editor).getByRole("textbox", { name: "Company Name Highlight" });
  await userEvent.clear(headline);
  await userEvent.type(headline, "Updated portal");
  await userEvent.click(within(editor).getByRole("button", { name: "Save and publish" }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
    "/organizations/workspace-settings",
    { loginCms: expect.objectContaining({ heroHeadlineHighlight: "Updated portal" }) },
  ));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(toast.success).toHaveBeenCalledTimes(1);
});

test("keeps the editor and draft open when publishing fails", async () => {
  jest.mocked(api.patch).mockRejectedValue({ response: { data: { message: ["Invalid CMS content"] } } });
  render(
    <MemoryRouter initialEntries={["/admin/settings/workspace?tab=login-cms"]}>
      <WorkspaceSettingsPage />
    </MemoryRouter>,
  );
  await screen.findByRole("heading", { name: "Welcome to Cedar portal" });
  await userEvent.click(screen.getByRole("button", { name: "Edit login page" }));
  const editor = screen.getByRole("dialog");
  const headline = within(editor).getByRole("textbox", { name: "Company Name Highlight" });
  await userEvent.clear(headline);
  await userEvent.type(headline, "Unsaved draft");
  await userEvent.click(within(editor).getByRole("button", { name: "Save and publish" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Invalid CMS content"));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(headline).toHaveValue("Unsaved draft");
  expect(toast.success).not.toHaveBeenCalled();
});

test("does not submit read-only domain status when saving workspace settings", async () => {
  jest.mocked(api.patch).mockResolvedValue({ data: {} });
  render(
    <MemoryRouter initialEntries={["/admin/settings/workspace"]}>
      <WorkspaceSettingsPage />
    </MemoryRouter>,
  );
  await screen.findByDisplayValue("Cedar Realty");
  await userEvent.click(screen.getByRole("button", { name: "Save Workspace Changes" }));
  await waitFor(() => expect(api.patch).toHaveBeenCalled());
  const payload = jest.mocked(api.patch).mock.calls[0][1];
  expect(payload).toEqual(expect.objectContaining({ companyName: "Cedar Realty", sidebarLogoAlign: "left" }));
  expect(payload).not.toHaveProperty("customDomainVerified");
  expect(payload).not.toHaveProperty("customDomainSslStatus");
});
