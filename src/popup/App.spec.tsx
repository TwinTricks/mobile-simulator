import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sendRequest } from "@/shared/messages";
import { App } from "./App";

vi.mock("@/shared/messages", () => ({ sendRequest: vi.fn() }));
vi.mock("@/storage/simulator-store", async () => {
  const actual = await vi.importActual<typeof import("@/storage/simulator-store")>(
    "@/storage/simulator-store",
  );
  return { ...actual, readSettings: vi.fn(async () => actual.DEFAULT_SETTINGS) };
});

const send = vi.mocked(sendRequest);

describe("popup", () => {
  beforeEach(() => {
    send.mockReset();
    vi.spyOn(window, "close").mockImplementation(() => {});
  });

  it("opens the simulator on the typed address", async () => {
    send.mockResolvedValue({ ok: true });
    render(<App />);
    await userEvent.type(screen.getByLabelText("URL to simulate"), "example.com{Enter}");
    expect(send).toHaveBeenCalledWith({ type: "open-simulator", url: "https://example.com/" });
    expect(window.close).toHaveBeenCalled();
  });

  it("lays the simulator over the current tab", async () => {
    send.mockResolvedValue({ ok: true });
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Full screen" }));
    expect(send).toHaveBeenCalledWith({ type: "open-full-screen" });
    expect(window.close).toHaveBeenCalled();
  });

  it("refuses an address that cannot be a URL", async () => {
    render(<App />);
    await userEvent.type(screen.getByLabelText("URL to simulate"), "https://exa mple.com");
    await userEvent.click(screen.getByRole("button", { name: /open simulator/i }));
    expect(screen.getByText("That doesn't look like a URL.")).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });

  it("says so when the current tab cannot be simulated", async () => {
    send.mockResolvedValue({ ok: true, url: "chrome://extensions" });
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /simulate current tab/i }));
    expect(await screen.findByText(/this tab can't be simulated/i)).toBeInTheDocument();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
