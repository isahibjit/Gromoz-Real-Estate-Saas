import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import toast from "react-hot-toast";

import { makeStore } from "../../../store";
import { ForgotPasswordScreen } from "./ForgotPasswordScreen";

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockedToast = toast as jest.Mocked<typeof toast>;

function renderForgotPasswordScreen() {
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

  return render(<ForgotPasswordScreen />, { wrapper: Wrapper });
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("renders the forgot password auth card", () => {
  renderForgotPasswordScreen();

  expect(screen.getByRole("img", { name: "Gromoze — Real Estate Sales. Simplified." })).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Forgot Password?" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/One-Time Password \(OTP\)/)).toBeInTheDocument();
  expect(screen.getByLabelText("Email or Mobile Number")).toBeInTheDocument();
  expect(
    screen.getByText("We'll send an OTP to verify your identity."),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Send OTP/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Back to Login/ })).toHaveAttribute(
    "href",
    "/login",
  );
  expect(screen.getByText("Need help?")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "+91 98700 66177" }),
  ).toBeInTheDocument();
});

test("validates identifier before requesting OTP", () => {
  renderForgotPasswordScreen();

  fireEvent.click(screen.getByRole("button", { name: /Send OTP/ }));

  expect(mockedToast.error).toHaveBeenCalledWith(
    "Enter your registered email or mobile number.",
  );
});

test("shows otp verification card after requesting OTP", () => {
  renderForgotPasswordScreen();

  fireEvent.change(screen.getByLabelText("Email or Mobile Number"), {
    target: {
      value: "admin@truroot.com",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /Send OTP/ }));

  expect(mockedToast.success).toHaveBeenCalledWith("OTP sent successfully.");
  expect(
    screen.getByRole("heading", { name: "OTP Verification" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/admin@truroot.com/)).toBeInTheDocument();
  expect(screen.getByText("Enter the 6-digit code")).toBeInTheDocument();
  expect(screen.getByLabelText("OTP digit 1")).toBeInTheDocument();
  expect(screen.getByText(/OTP will expire in/)).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Verify OTP/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Change Email \/ Mobile Number/ }),
  ).toBeInTheDocument();
});

test("validates otp and can return to identifier form", () => {
  renderForgotPasswordScreen();

  fireEvent.change(screen.getByLabelText("Email or Mobile Number"), {
    target: {
      value: "admin@truroot.com",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /Send OTP/ }));
  fireEvent.click(screen.getByRole("button", { name: /Verify OTP/ }));

  expect(mockedToast.error).toHaveBeenCalledWith(
    "Enter the complete 6-digit OTP.",
  );

  fireEvent.click(
    screen.getByRole("button", { name: /Change Email \/ Mobile Number/ }),
  );

  expect(
    screen.getByRole("heading", { name: "Forgot Password?" }),
  ).toBeInTheDocument();
});

test("shows reset password card after valid otp verification", () => {
  renderForgotPasswordScreen();

  fireEvent.change(screen.getByLabelText("Email or Mobile Number"), {
    target: {
      value: "admin@truroot.com",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /Send OTP/ }));
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

  expect(
    screen.getByRole("heading", { name: "Reset Password" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("New Password")).toBeInTheDocument();
  expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
});
