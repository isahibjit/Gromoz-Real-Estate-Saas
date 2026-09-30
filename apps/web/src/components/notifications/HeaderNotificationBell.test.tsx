import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { api } from "../../common/api";
import { HeaderNotificationBell } from "./HeaderNotificationBell";

jest.mock("../../common/api", () => ({
  api: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

test("loads the notification feed from the registered notifications endpoint", async () => {
  mockedApi.get.mockResolvedValue({
    data: { unreadCount: 0, data: [], meta: { page: 1, limit: 10, total: 0 } },
  });

  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <HeaderNotificationBell />
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(mockedApi.get).toHaveBeenCalledWith("/notifications");
  });
});
