import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import toast from "react-hot-toast";

import { makeStore } from "../../../store";
import { clearStoredRefreshToken } from "../../../common/authSession";
import { requestLoginOtp, verifyLoginOtp } from "../../../common/services/auth.api";
import { LoginOtpScreen } from "./LoginOtpScreen";

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

jest.mock("../../../common/services/auth.api", () => ({
  requestLoginOtp: jest.fn(),
  verifyLoginOtp: jest.fn(),
}));

const mockedToast = toast as jest.Mocked<typeof toast>;
const mockedRequestLoginOtp = requestLoginOtp as jest.MockedFunction<
  typeof requestLoginOtp
>;
const mockedVerifyLoginOtp = verifyLoginOtp as jest.MockedFunction<
  typeof verifyLoginOtp
>;

function renderLoginOtpScreen() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
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
    ...render(<LoginOtpScreen />, { wrapper: Wrapper }),
    queryClient,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  clearStoredRefreshToken();
  mockedRequestLoginOtp.mockResolvedValue({
    success: true,
    message: "If the account exists, an OTP has been sent.",
    expiresInSeconds: 300,
    resendAfterSeconds: 60,
  });
  mockedVerifyLoginOtp.mockResolvedValue({
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
});

test("renders login otp request card", () => {
  renderLoginOtpScreen();

  expect(screen.getByRole("img", { name: "Gromoze — Real Estate Sales. Simplified." })).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Login with OTP" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Email or Mobile Number")).toBeInTheDocument();
  expect(
    screen.getByText("We'll send an OTP to verify your login."),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Send OTP/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Back to Login/ })).toHaveAttribute(
    "href",
    "/login",
  );
});

test("shows toast validation when identifier is empty", () => {
  renderLoginOtpScreen();

  fireEvent.click(screen.getByRole("button", { name: /Send OTP/ }));

  expect(mockedToast.error).toHaveBeenCalledWith(
    "Enter your email or mobile number to receive OTP.",
  );
});

test("shows otp card after requesting login otp and verifies via toast", async () => {
  const { queryClient } = renderLoginOtpScreen();
  const identifierInput = screen.getByLabelText("Email or Mobile Number");
  expect(identifierInput).toHaveAttribute("autocomplete", "off");
  expect(identifierInput.closest("form")).toHaveAttribute("autocomplete", "off");

  fireEvent.change(screen.getByLabelText("Email or Mobile Number"), {
    target: {
      value: "admin@truroot.com",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /Send OTP/ }));

  await waitFor(() => {
    expect(mockedToast.success).toHaveBeenCalledWith("OTP sent successfully.");
  });
  expect(
    await screen.findByRole("heading", { name: "Login OTP Verification" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/admin@truroot.com/)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("OTP digit 1"), {
    target: { value: "1" },
  });
  fireEvent.change(screen.getByLabelText("OTP digit 2"), {
    target: { value: "2" },
  });
  fireEvent.change(screen.getByLabelText("OTP digit 3"), {
    target: { value: "3" },
  });
  fireEvent.change(screen.getByLabelText("OTP digit 4"), {
    target: { value: "4" },
  });
  fireEvent.change(screen.getByLabelText("OTP digit 5"), {
    target: { value: "5" },
  });
  fireEvent.change(screen.getByLabelText("OTP digit 6"), {
    target: { value: "6" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Verify OTP/ }));

  await waitFor(() => {
    expect(mockedToast.success).toHaveBeenCalledWith("Signed in as Admin User.");
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
  });
  expect(localStorage.getItem("truroot_refresh_token")).toBeNull();
  expect(sessionStorage.getItem("truroot_refresh_token")).toBe("refresh-token");
});

test("can return to identifier form from otp card", async () => {
  renderLoginOtpScreen();

  fireEvent.change(screen.getByLabelText("Email or Mobile Number"), {
    target: {
      value: "admin@truroot.com",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /Send OTP/ }));
  expect(
    await screen.findByRole("heading", { name: "Login OTP Verification" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: /Change Email \/ Mobile Number/ }),
  );

  expect(
    screen.getByRole("heading", { name: "Login with OTP" }),
  ).toBeInTheDocument();
});
