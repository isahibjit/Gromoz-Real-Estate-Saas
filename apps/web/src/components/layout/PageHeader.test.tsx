import { render, screen } from "@testing-library/react";

import { PageHeader, WorkspacePage } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the shared title, supporting copy, and actions", () => {
    render(
      <PageHeader
        title="Lead performance"
        subtitle="Review tenant activity."
        actions={<button type="button">Export</button>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Lead performance", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("Review tenant activity.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });
});

describe("WorkspacePage", () => {
  it("uses a non-landmark wrapper inside the workspace main region", () => {
    const { container } = render(
      <WorkspacePage className="test-page">Page content</WorkspacePage>,
    );

    expect(container.querySelector("main")).not.toBeInTheDocument();
    expect(screen.getByText("Page content")).toHaveClass(
      "space-y-5",
      "test-page",
    );
  });
});
