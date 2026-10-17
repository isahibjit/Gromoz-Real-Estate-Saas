import { render, screen, within } from "@testing-library/react";
import { defaultLoginPageCms } from "./LoginPageCmsModal";
import { LoginPagePreview } from "./LoginPagePreview";

test("previews configured content with disabled sign-in controls", () => {
  render(
    <LoginPagePreview
      data={{
        ...defaultLoginPageCms,
        heroHeadlineHighlight: "Cedar Realty",
        cardTitle: "Sign in to Cedar",
        supportPhone: "+91 12345 67890",
        supportEmail: "help@cedar.example",
      }}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Welcome to Cedar Realty" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Sign in to Cedar" }),
  ).toBeInTheDocument();
  expect(screen.getByText("help@cedar.example")).toBeInTheDocument();
  const preview = screen.getByRole("group", { name: "Sign-in form preview" });
  expect(
    within(preview).getByLabelText("Email or mobile number"),
  ).toBeDisabled();
  expect(within(preview).getByLabelText("Password")).toBeDisabled();
  expect(within(preview).getByRole("button", { name: "Login" })).toBeDisabled();
});

test("honors logo, features and download visibility when CMS data changes", () => {
  const data = {
    ...defaultLoginPageCms,
    heroLogoUrl: "/cedar-logo.png",
    showDownloadApp: false,
    features: [{ title: "Your property workspace" }],
  };
  const view = render(<LoginPagePreview data={data} />);
  expect(screen.getByRole("img", { name: "Brand Logo" })).toHaveAttribute(
    "src",
    "/cedar-logo.png",
  );
  expect(screen.getByText("Your property workspace")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /Download Android/ }),
  ).not.toBeInTheDocument();
  view.rerender(
    <LoginPagePreview
      data={{
        ...data,
        heroLogoUrl: "",
        showDownloadApp: true,
        downloadAppLabel: "Get the Cedar app",
      }}
    />,
  );
  expect(
    screen.getByRole("img", {
      name: "Gromoze — Real Estate Sales. Simplified.",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Get the Cedar app" }),
  ).toBeDisabled();
});
