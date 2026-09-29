import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  TablePageSizeOptions,
} from "ui";

function TableHarness({ sizes = [8, 16, 24] }: { sizes?: number[] }) {
  const [pageSize, setPageSize] = useState(sizes[0]);
  const [page, setPage] = useState(2);
  return (
    <>
      <Select
        value={String(pageSize)}
        onValueChange={(value) => {
          setPageSize(Number(value));
          setPage(1);
        }}
      >
        <SelectTrigger aria-label="Rows per page">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <TablePageSizeOptions sizes={sizes} />
        </SelectContent>
      </Select>
      <p>Page {page}</p>
      <table>
        <tbody>
          {Array.from({ length: Math.min(pageSize, 75) }, (_, index) => (
            <tr key={index}>
              <td>Record {index + 1}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = jest.fn();
});

it("retains existing sizes and adds 50 and 100 in order without duplicates", () => {
  render(<TableHarness sizes={[24, 8, 16, 50, 100, 50]} />);
  fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
  expect(
    screen.getAllByRole("option").map((option) => option.textContent),
  ).toEqual(["Show 8", "Show 16", "Show 24", "Show 50", "Show 100"]);
});

it.each([50, 100])(
  "supports selecting %s results and resetting pagination",
  (size) => {
    render(<TableHarness />);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: `Show ${size}` }));
    expect(screen.getByRole("combobox")).toHaveTextContent(`Show ${size}`);
    expect(screen.getByText("Page 1")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(
      Math.min(size, 75),
    );
  },
);
