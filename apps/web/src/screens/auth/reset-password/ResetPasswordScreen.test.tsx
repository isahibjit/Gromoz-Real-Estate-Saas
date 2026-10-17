import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import toast from "react-hot-toast";

import { makeStore } from "../../../store";
import { ResetPasswordScreen } from "./ResetPasswordScreen";

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockedToast = toast as jest.Mocked<typeof toast>;

function renderResetPasswordScreen() {
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

  return render(<ResetPasswordScreen />, { wrapper: Wrapper });
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("renders the reset password auth card", () => {
  renderResetPasswordScreen();

  expect(screen.getByRole("img", { name: "Gromoze — Real Estate Sales. Simplified." })).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Reset Password" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Create a new password/)).toBeInTheDocument();
  expect(screen.getByLabelText("New Password")).toBeInTheDocument();
  expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
  expect(screen.getByText(/Password Strength:/)).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /Reset Password/ }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Back to Login/ })).toHaveAttribute(
    "href",
    "/login",
  );
  expect(screen.getByText("Security Tip")).toBeInTheDocument();
});

test("toggles password visibility", () => {
  renderResetPasswordScreen();

  const passwordInput = screen.getByLabelText("New Password");
  const confirmInput = screen.getByLabelText("Confirm Password");

  expect(passwordInput).toHaveAttribute("type", "password");
  expect(confirmInput).toHaveAttribute("type", "password");

  fireEvent.click(screen.getByRole("button", { name: "Show new password" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Show confirm password" }),
  );

  expect(passwordInput).toHaveAttribute("type", "text");
  expect(confirmInput).toHaveAttribute("type", "text");
});

test("validates reset password fields", () => {
  renderResetPasswordScreen();

  fireEvent.change(screen.getByLabelText("New Password"), {
    target: {
      value: "short",
    },
  });
  fireEvent.change(screen.getByLabelText("Confirm Password"), {
    target: {
      value: "short",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /Reset Password/ }));

  expect(mockedToast.error).toHaveBeenCalledWith(
    "Use at least 8 characters for your new password.",
  );

  fireEvent.change(screen.getByLabelText("New Password"), {
    target: {
      value: "Password@123",
    },
  });
  fireEvent.change(screen.getByLabelText("Confirm Password"), {
    target: {
      value: "Password@456",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /Reset Password/ }));

  expect(mockedToast.error).toHaveBeenCalledWith(
    "New password and confirm password must match.",
  );
});

test("shows fallback reset captured state for valid passwords", () => {
  renderResetPasswordScreen();

  fireEvent.change(screen.getByLabelText("New Password"), {
    target: {
      value: "Password@123",
    },
  });
  fireEvent.change(screen.getByLabelText("Confirm Password"), {
    target: {
      value: "Password@123",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: /Reset Password/ }));

  expect(mockedToast.success).toHaveBeenCalledWith(
    "Password reset successfully.",
  );
});
