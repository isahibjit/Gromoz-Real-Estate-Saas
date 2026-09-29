import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import App from "./App";
import { useRefreshSession } from "./common/queries/useRefreshSession";
import { makeStore } from "./store";
import { setCredentials } from "./store/slices/authSlice";

jest.mock("./common/queries/useRefreshSession", () => ({
  useRefreshSession: jest.fn(),
}));
jest.mock("./common/services/auth.api", () => ({
  login: jest.fn(),
  logout: jest.fn(),
  refreshSession: jest.fn(),
}));

const mockedUseRefreshSession = useRefreshSession as jest.MockedFunction<
  typeof useRefreshSession
>;
let consoleWarnSpy: jest.SpyInstance;

function renderApp(authenticated: boolean, initialPath = "/dashboard") {
  const store = makeStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  if (authenticated) {
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
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MemoryRouter initialEntries={[initialPath]}>
          <App />
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  consoleWarnSpy = jest
    .spyOn(console, "warn")
    .mockImplementation(() => undefined);
  mockedUseRefreshSession.mockReturnValue({ isPending: false } as ReturnType<
    typeof useRefreshSession
  >);
});

afterEach(() => {
  consoleWarnSpy.mockRestore();
});

test("shows login on the public login route for unauthenticated users", () => {
  renderApp(false, "/login");
  expect(
    screen.getByRole("heading", { name: "Login to Your Account" }),
  ).toBeInTheDocument();
});

test("shows login otp on the public login otp route for unauthenticated users", () => {
  renderApp(false, "/login/otp");
  expect(
    screen.getByRole("heading", { name: "Login with OTP" }),
  ).toBeInTheDocument();
});

test("shows forgot password on the public forgot password route for unauthenticated users", () => {
  renderApp(false, "/forgot-password");
  expect(
    screen.getByRole("heading", { name: "Forgot Password?" }),
  ).toBeInTheDocument();
});

test("shows reset password on the public reset password route for unauthenticated users", () => {
  renderApp(false, "/reset-password");
  expect(
    screen.getByRole("heading", { name: "Reset Password" }),
  ).toBeInTheDocument();
});

test("shows dashboard on the protected dashboard route for authenticated users", () => {
  renderApp(true, "/dashboard");
  expect(
    screen.getByRole("heading", { name: "Dashboard" }),
  ).toBeInTheDocument();
});

test("shows add lead on the protected add lead route for authenticated users", () => {
  renderApp(true, "/leads/add");
  expect(
    screen.getByRole("heading", { name: "Add New Lead" }),
  ).toBeInTheDocument();
});

test("redirects unauthenticated users from dashboard to login", () => {
  renderApp(false, "/dashboard");
  expect(
    screen.getByRole("heading", { name: "Login to Your Account" }),
  ).toBeInTheDocument();
});

test("redirects authenticated users away from login to dashboard", () => {
  renderApp(true, "/login");
  expect(
    screen.getByRole("heading", { name: "Dashboard" }),
  ).toBeInTheDocument();
});

test("redirects the root route to the dashboard entrypoint", () => {
  renderApp(true, "/");
  expect(
    screen.getByRole("heading", { name: "Dashboard" }),
  ).toBeInTheDocument();
});

test("shows loading state while the session refreshes", () => {
  mockedUseRefreshSession.mockReturnValue({ isPending: true } as ReturnType<
    typeof useRefreshSession
  >);
  renderApp(false, "/dashboard");
  expect(screen.getByText("Loading workspace...")).toBeInTheDocument();
});
