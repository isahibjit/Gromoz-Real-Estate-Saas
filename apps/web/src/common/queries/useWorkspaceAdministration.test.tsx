import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { makeStore } from "../../store";
import { setCredentials } from "../../store/slices/authSlice";
import { api } from "../api";
import { useWorkspaceAdministration } from "./useWorkspaceAdministration";
jest.mock("../api", () => ({ api: { get: jest.fn() } }));
const mocked = jest.mocked(api);
function Result() {
  const access = useWorkspaceAdministration();
  return (
    <span>
      {access.isPending ? "Checking" : access.canManage ? "Allowed" : "Denied"}
    </span>
  );
}
test("changes subscription visibility with the active membership rather than the global role", async () => {
  const store = makeStore();
  store.dispatch(
    setCredentials({
      accessToken: "test",
      user: {
        id: "user",
        email: "user@example.test",
        role: "SALES_AGENT",
        permissions: [],
      },
    }),
  );
  localStorage.setItem("active_organization_id", "tenant-a");
  mocked.get.mockResolvedValue({
    data: [
      {
        organizationId: "tenant-a",
        slug: "a",
        role: "SALES_AGENT",
        isOwner: true,
      },
      {
        organizationId: "tenant-b",
        slug: "b",
        role: "SALES_AGENT",
        isOwner: false,
      },
    ],
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const tree = () => (
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <Result />
      </QueryClientProvider>
    </Provider>
  );
  const view = render(tree());
  expect(await screen.findByText("Allowed")).toBeInTheDocument();
  localStorage.setItem("active_organization_id", "tenant-b");
  view.rerender(tree());
  await waitFor(() => expect(screen.getByText("Denied")).toBeInTheDocument());
  expect(mocked.get).toHaveBeenCalledTimes(2);
});
