import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import type { ReactNode } from "react";
import type { LoginResponse } from "@truroot/shared/auth";
import { MemoryRouter } from "react-router-dom";
import toast from "react-hot-toast";

import { makeStore } from "../../../store";
import {
  login,
  requestLoginOtp,
  verifyLoginOtp,
} from "../../../common/services/auth.api";
import { LoginScreen } from "./login";

jest.mock("../../../common/services/auth.api", () => ({
  login: jest.fn(),
  logout: jest.fn(),
  requestLoginOtp: jest.fn(),
  refreshSession: jest.fn(),
  verifyLoginOtp: jest.fn(),
}));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockedLogin = login as jest.MockedFunction<typeof login>;
const mockedRequestLoginOtp = requestLoginOtp as jest.MockedFunction<
  typeof requestLoginOtp
>;
const mockedVerifyLoginOtp = verifyLoginOtp as jest.MockedFunction<
  typeof verifyLoginOtp
>;
const mockedToast = toast as jest.Mocked<typeof toast>;

function renderLoginScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  const store = makeStore();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MemoryRouter>{children}</MemoryRouter>
      </Provider>
    </QueryClientProvider>
  );

  return {
    ...render(<LoginScreen />, {
      wrapper: Wrapper,
    }),
    queryClient,
    store,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("renders the login screen content", () => {
  renderLoginScreen();

  expect(screen.getByAltText("Truroot Realty CRM")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /Welcome to/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Login to Your Account" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Email or mobile number")).toBeInTheDocument();
  expect(screen.getByText("Password")).toBeInTheDocument();
  expect(screen.getByLabelText("Email or mobile number")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
  expect(screen.getByLabelText("Remember me")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Forgot Password?" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  expect(
    screen.getByText(/If two-factor authentication is enabled/i),
  ).toBeInTheDocument();
  expect(screen.getByText("Manage Leads")).toBeInTheDocument();
  expect(screen.getByText("Track Activities")).toBeInTheDocument();
  expect(
    screen.getByText("Secure. Reliable. Always with You."),
  ).toBeInTheDocument();
  expect(screen.getByText("Need help?")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "+91 98765 43210" })).toHaveAttribute(
    "href",
    "tel:+919876543210",
  );
  expect(
    screen.getByRole("link", { name: "support@truerootrealty.com" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Terms of Use" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Privacy Policy" }),
  ).toBeInTheDocument();
});

test("toggles password visibility", () => {
  renderLoginScreen();

  const passwordInput = screen.getByLabelText("Password");
  const toggleButton = screen.getByRole("button", { name: "Show password" });

  expect(passwordInput).toHaveAttribute("type", "password");

  fireEvent.click(toggleButton);

  expect(passwordInput).toHaveAttribute("type", "text");
  expect(
    screen.getByRole("button", { name: "Hide password" }),
  ).toBeInTheDocument();
});


test("submits valid credentials and hydrates auth state", async () => {
  const { store } = renderLoginScreen();

  mockedLogin.mockResolvedValueOnce({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    user: {
      id: "user-1",
      email: "admin@truroot.com",
      role: "ADMIN",
      fullName: "Admin User",
      permissions: [],
    },
  });

  fireEvent.change(screen.getByLabelText("Email or mobile number"), {
    target: {
      value: "9999999990",
    },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: {
      value: "password123",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));

  await waitFor(() => {
    expect(mockedLogin).toHaveBeenCalled();
  });

  expect(mockedLogin.mock.calls[0][0]).toEqual({
    mobile: "9999999990",
    password: "password123",
  });

  expect(store.getState().auth).toMatchObject({
    accessToken: "access-token",
    isAuthenticated: true,
    user: {
      email: "admin@truroot.com",
    },
  });
  await waitFor(() => {
    expect(mockedToast.success).toHaveBeenCalledWith(
      "Signed in as Admin User.",
    );
  });
});

test("clears stale lead queries before hydrating the next login", async () => {
  const { queryClient, store } = renderLoginScreen();
  const staleLeadQueryKey = ["leads", "all", "admin-user"];

  queryClient.setQueryData(staleLeadQueryKey, {
    rows: [{ id: "admin-lead" }],
    total: 1,
  });

  mockedLogin.mockResolvedValueOnce({
    accessToken: "sales-access-token",
    refreshToken: "sales-refresh-token",
    user: {
      id: "sales-user",
      email: "sales@truroot.com",
      role: "SALES_AGENT",
      fullName: "Sales User",
      permissions: [],
    },
  });

  fireEvent.change(screen.getByLabelText("Email or mobile number"), {
    target: {
      value: "sales@truroot.com",
    },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: {
      value: "password123",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));

  await waitFor(() => {
    expect(store.getState().auth.user?.id).toBe("sales-user");
  });

  expect(queryClient.getQueryData(staleLeadQueryKey)).toBeUndefined();
});

test("shows validation errors without calling the login API", async () => {
  renderLoginScreen();

  fireEvent.change(screen.getByLabelText("Email or mobile number"), {
    target: {
      value: "123",
    },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: {
      value: "password123",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));

  expect(mockedLogin).not.toHaveBeenCalled();
  expect(mockedToast.error).toHaveBeenCalledWith(
    "Enter a valid email or mobile number and password.",
  );
});

test("submits email credentials when the identifier contains an at sign", async () => {
  renderLoginScreen();

  mockedLogin.mockResolvedValueOnce({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    user: {
      id: "user-1",
      email: "admin@truroot.com",
      role: "ADMIN",
      fullName: "Admin User",
      permissions: [],
    },
  });

  fireEvent.change(screen.getByLabelText("Email or mobile number"), {
    target: {
      value: "admin@truroot.com",
    },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: {
      value: "password123",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));

  await waitFor(() => {
    expect(mockedLogin).toHaveBeenCalled();
  });
  expect(mockedLogin.mock.calls[0][0]).toEqual({
    email: "admin@truroot.com",
    password: "password123",
  });
});

test("shows API errors from failed login attempts", async () => {
  renderLoginScreen();

  mockedLogin.mockRejectedValueOnce({
    isAxiosError: true,
    response: {
      data: {
        message: "Invalid credentials",
      },
    },
  });

  fireEvent.change(screen.getByLabelText("Email or mobile number"), {
    target: {
      value: "9999999990",
    },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: {
      value: "wrong-password",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));

  await waitFor(() => {
    expect(mockedToast.error).toHaveBeenCalledWith("Invalid credentials");
  });
});

test("shows OTP verification after password login requires two-factor auth", async () => {
  mockedLogin.mockResolvedValueOnce({
    requiresOtp: true,
    identifier: "admin@truroot.com",
    success: true,
    message: "If the account exists, an OTP has been sent.",
    expiresInSeconds: 300,
    resendAfterSeconds: 60,
  });
  mockedVerifyLoginOtp.mockResolvedValueOnce({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    user: {
      id: "user-1",
      email: "admin@truroot.com",
      role: "ADMIN",
      fullName: "Admin User",
      permissions: [],
    },
  });

  renderLoginScreen();

  fireEvent.change(screen.getByLabelText("Email or mobile number"), {
    target: {
      value: "admin@truroot.com",
    },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: {
      value: "password123",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));

  await waitFor(() => {
    expect(
      screen.getByRole("heading", { name: "Two-factor verification" }),
    ).toBeInTheDocument();
  });

  "123456".split("").forEach((digit, index) => {
    fireEvent.change(screen.getByLabelText(`OTP digit ${index + 1}`), {
      target: { value: digit },
    });
  });
  fireEvent.click(screen.getByRole("button", { name: /verify otp/i }));

  await waitFor(() => {
    expect(mockedVerifyLoginOtp).toHaveBeenCalledWith({
      identifier: "admin@truroot.com",
      otp: "123456",
    });
  });
});

test("disables login actions while submission is pending", async () => {
  let resolveLogin: (value: LoginResponse) => void;

  mockedLogin.mockReturnValueOnce(
    new Promise((resolve) => {
      resolveLogin = resolve;
    }),
  );

  renderLoginScreen();

  fireEvent.change(screen.getByLabelText("Email or mobile number"), {
    target: {
      value: "9999999990",
    },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: {
      value: "password123",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));

  await waitFor(() => {
    expect(
      screen.getByRole("button", { name: "Signing in..." }),
    ).toBeDisabled();
  });
  expect(
    screen.getByText(/If two-factor authentication is enabled/i),
  ).toBeInTheDocument();

  resolveLogin!({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    user: {
      id: "user-1",
      email: "admin@truroot.com",
      role: "ADMIN",
      fullName: "Admin User",
      permissions: [],
    },
  });

  await waitFor(() => {
    expect(mockedToast.success).toHaveBeenCalledWith(
      "Signed in as Admin User.",
    );
  });
});

test("shows security warning toast when remaining login attempts message is returned", async () => {
  renderLoginScreen();

  const warningError = {
    response: {
      status: 401,
      data: {
        message:
          "Incorrect password. You have 2 attempts remaining before your account is deactivated.",
      },
    },
  };

  mockedLogin.mockRejectedValueOnce(warningError);

  fireEvent.change(screen.getByLabelText("Email or mobile number"), {
    target: { value: "agent@truroot.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "WrongPassword123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));

  await waitFor(() => {
    expect(mockedToast.error).toHaveBeenCalledWith(
      "Incorrect password. You have 2 attempts remaining before your account is deactivated.",
    );
  });
});

test("shows account deactivated toast when account lockout error is returned", async () => {
  renderLoginScreen();

  const lockoutError = {
    response: {
      status: 401,
      data: {
        message:
          "Your account has been deactivated due to 3 consecutive failed login attempts. An administrator has been notified. Please contact an administrator to reactivate your ID.",
      },
    },
  };

  mockedLogin.mockRejectedValueOnce(lockoutError);

  fireEvent.change(screen.getByLabelText("Email or mobile number"), {
    target: { value: "agent@truroot.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "WrongPassword123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));

  await waitFor(() => {
    expect(mockedToast.error).toHaveBeenCalledWith(
      "Your account has been deactivated due to 3 consecutive failed login attempts. An administrator has been notified. Please contact an administrator to reactivate your ID.",
    );
  });
});

