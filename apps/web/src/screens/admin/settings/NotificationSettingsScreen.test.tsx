import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";

import { api } from "../../../common/api";
import { ACTIVE_ORGANIZATION_KEY } from "../../../common/tenantRequestScope";
import { NotificationSettingsScreen } from "./NotificationSettingsScreen";

jest.mock("../../../common/api", () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

function responseFor(url: string) {
  if (url === "/notifications/settings") {
    return Promise.resolve({
      data: {
        id: "settings-1",
        organizationId: localStorage.getItem(ACTIVE_ORGANIZATION_KEY),
        globalFcmEnabled: true,
        globalWhatsAppEnabled: false,
        eventSettings: {},
        canManage: false,
      },
    });
  }
  if (url === "/notifications/whatsapp-config") {
    return Promise.resolve({
      data: {
        organizationId: localStorage.getItem(ACTIVE_ORGANIZATION_KEY),
        providerMode: "CUSTOM_PINBOT",
        ready: true,
        readinessMessage: "Custom Pinbot sender is ready",
        customApiUrl: "https://p•••••••••••••••••••••••••••••ai",
        customSenderNumber: "********3210",
        customTemplateLanguage: "en",
        hasCustomApiKey: true,
        canManage: false,
        updatedAt: null,
      },
    });
  }
  return Promise.resolve({
    data: { data: [], meta: { page: 1, limit: 10, total: 0 } },
  });
}

test("keeps cached notification data tenant-bound and makes spectator mode read-only", async () => {
  localStorage.setItem(ACTIVE_ORGANIZATION_KEY, "tenant-a");
  mockedApi.get.mockImplementation((url) => responseFor(String(url)));
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <NotificationSettingsScreen />
    </QueryClientProvider>,
  );

  expect(
    await screen.findByText(/platform administrators can inspect/i),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Provider mode")).toBeDisabled();

  localStorage.setItem(ACTIVE_ORGANIZATION_KEY, "tenant-b");
  view.rerender(
    <QueryClientProvider client={client}>
      <NotificationSettingsScreen />
    </QueryClientProvider>,
  );

  await waitFor(() => {
    expect(
      mockedApi.get.mock.calls.filter(
        ([url]) => url === "/notifications/settings",
      ),
    ).toHaveLength(2);
  });
});
