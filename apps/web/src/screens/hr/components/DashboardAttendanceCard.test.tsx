import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";

import { api } from "../../../common/api";
import { makeStore } from "../../../store";
import { setCredentials } from "../../../store/slices/authSlice";
import { DashboardAttendanceCard } from "./DashboardAttendanceCard";

jest.mock("../../../common/api", () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));
jest.mock("./AttendanceSelfieCaptureDialog", () => ({
  AttendanceSelfieCaptureDialog: ({
    mode,
    open,
    onSuccess,
  }: {
    mode: "punchIn" | "punchOut";
    open: boolean;
    onSuccess: (imageUrl: string) => void;
  }) =>
    open ? (
      <button type="button" onClick={() => onSuccess(`${mode}-selfie.jpg`)}>
        Submit {mode} selfie
      </button>
    ) : null,
}));

const mockedApi = api as jest.Mocked<typeof api>;

test("uploads a selfie URL with punch out", async () => {
  mockedApi.get.mockResolvedValue({
    data: {
      status: "Present",
      canPunchIn: false,
      canPunchOut: true,
      checkInAt: "2026-09-18T03:30:00.000Z",
    },
  });
  mockedApi.post.mockResolvedValue({ data: {} });

  const store = makeStore();
  store.dispatch(
    setCredentials({
      accessToken: "token",
      user: {
        id: "employee-1",
        email: "employee@example.com",
        fullName: "Employee User",
        role: "SALES_AGENT",
        permissions: [
          {
            moduleKey: "attendance",
            canView: true,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
            canPunchIn: false,
            canPunchOut: true,
          },
        ],
      },
    }),
  );

  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <Provider store={store}>
        <DashboardAttendanceCard />
      </Provider>
    </QueryClientProvider>,
  );

  fireEvent.click(await screen.findByRole("button", { name: "Punch Out" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Submit punchOut selfie" }),
  );

  await waitFor(() =>
    expect(mockedApi.post).toHaveBeenCalledWith("/attendance/punch-out", {
      checkOutImageUrl: "punchOut-selfie.jpg",
    }),
  );
});
