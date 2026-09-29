import { api } from "../api";
import {
  login,
  refreshSession,
  requestLoginOtp,
  verifyLoginOtp,
} from "./auth.api";

jest.mock("../api", () => ({
  api: {
    post: jest.fn(),
  },
}));

const mockedPost = api.post as jest.MockedFunction<typeof api.post>;

beforeEach(() => {
  jest.clearAllMocks();
});

const authResponse = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  user: {
    id: "user-1",
    email: "admin@truroot.com",
    role: "ADMIN",
    fullName: "Admin User",
    permissions: [],
  },
};

test("login posts validated credentials and parses auth tokens", async () => {
  mockedPost.mockResolvedValueOnce({
    data: authResponse,
  });

  await expect(
    login({
      mobile: "9999999990",
      password: "password123",
    }),
  ).resolves.toEqual(authResponse);

  expect(mockedPost).toHaveBeenCalledWith("/auth/login", {
    mobile: "9999999990",
    password: "password123",
  });
});

test("login accepts email credentials for backward compatibility", async () => {
  mockedPost.mockResolvedValueOnce({
    data: authResponse,
  });

  await expect(
    login({
      email: "admin@truroot.com",
      password: "password123",
    }),
  ).resolves.toEqual(authResponse);

  expect(mockedPost).toHaveBeenCalledWith("/auth/login", {
    email: "admin@truroot.com",
    password: "password123",
  });
});

test("refreshSession parses auth tokens", async () => {
  mockedPost.mockResolvedValueOnce({
    data: authResponse,
  });

  await expect(refreshSession()).resolves.toEqual(authResponse);
  expect(mockedPost).toHaveBeenCalledWith("/auth/refresh");
});

test("requestLoginOtp posts identifier and parses timing response", async () => {
  const otpResponse = {
    success: true,
    message: "If the account exists, an OTP has been sent.",
    expiresInSeconds: 300,
    resendAfterSeconds: 60,
  };
  mockedPost.mockResolvedValueOnce({
    data: otpResponse,
  });

  await expect(
    requestLoginOtp({ identifier: "9999999990" }),
  ).resolves.toEqual(otpResponse);
  expect(mockedPost).toHaveBeenCalledWith("/auth/otp/request", {
    identifier: "9999999990",
  });
});

test("verifyLoginOtp posts otp and parses auth tokens", async () => {
  mockedPost.mockResolvedValueOnce({
    data: authResponse,
  });

  await expect(
    verifyLoginOtp({ identifier: "9999999990", otp: "123456" }),
  ).resolves.toEqual(authResponse);
  expect(mockedPost).toHaveBeenCalledWith("/auth/otp/verify", {
    identifier: "9999999990",
    otp: "123456",
  });
});

test("login rejects invalid auth responses", async () => {
  mockedPost.mockResolvedValueOnce({
    data: {
      accessToken: "access-token",
    },
  });

  await expect(
    login({
      mobile: "9999999990",
      password: "password123",
    }),
  ).rejects.toThrow();
});
