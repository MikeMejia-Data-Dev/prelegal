// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, authenticate, getSession } from "@/lib/auth";
import { NDA_ID } from "@/lib/documents/catalog";
import { defaultFormData } from "@/lib/nda/buildNda";
import { testCatalog } from "@/test/catalog";

const router = { push: vi.fn(), replace: vi.fn() };
let searchParams = new URLSearchParams();
let pathname = "/documents/";
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => pathname,
  useSearchParams: () => searchParams,
}));

import { AppShell } from "./AppShell";
import { AuthForm } from "./AuthForm";
import { SavedDocuments } from "./SavedDocuments";
import { SavedDocumentView } from "./SavedDocumentView";

const fetchMock = vi.fn();
const reply = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));
const SESSION = { token: "t0k3n", email: "ada@example.com" };
const signIn = () => localStorage.setItem("prelegal.session", JSON.stringify(SESSION));

const catalog = testCatalog;

beforeEach(() => {
  localStorage.clear();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  router.push.mockReset();
  router.replace.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("auth library", () => {
  it("stores the session after signing in", async () => {
    fetchMock.mockReturnValue(reply(200, SESSION));
    expect(await authenticate("signin", "ada@example.com", "secret123")).toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/signin");
    expect(getSession()).toEqual(SESSION);
  });

  it("returns the server's message for a duplicate email or wrong password", async () => {
    fetchMock.mockReturnValue(reply(409, { detail: "An account with this email already exists." }));
    expect(await authenticate("signup", "ada@example.com", "secret123")).toBe("An account with this email already exists.");
    expect(getSession()).toBeNull();
  });

  it("sends the token with API calls", async () => {
    signIn();
    fetchMock.mockReturnValue(reply(200, []));
    await apiFetch("/api/documents");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer t0k3n");
  });

  it("signs out and returns to sign in when the session has ended", async () => {
    signIn();
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    fetchMock.mockReturnValue(reply(401, { detail: "Please sign in." }));
    await expect(apiFetch("/api/documents")).rejects.toThrow();
    expect(getSession()).toBeNull();
    expect(assign).toHaveBeenCalledWith("/");
  });
});

describe("AuthForm", () => {
  it("signs in and opens the creator", async () => {
    fetchMock.mockReturnValue(reply(200, SESSION));
    const user = userEvent.setup();
    render(<AuthForm mode="signin" />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/create/"));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: "ada@example.com", password: "secret123" });
  });

  it("shows the error and stays on the page when sign in fails", async () => {
    fetchMock.mockReturnValue(reply(401, { detail: "Incorrect email or password." }));
    const user = userEvent.setup();
    render(<AuthForm mode="signin" />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("signs up through the sign up endpoint and links back to sign in", async () => {
    fetchMock.mockReturnValue(reply(201, SESSION));
    const user = userEvent.setup();
    render(<AuthForm mode="signup" />);
    expect(screen.getByRole("heading", { name: "Create your account" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/");
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/create/"));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/signup");
  });

  it("skips the form when already signed in", () => {
    signIn();
    render(<AuthForm mode="signin" />);
    expect(router.replace).toHaveBeenCalledWith("/create/");
  });
});

describe("AppShell", () => {
  it("sends signed-out visitors to sign in", () => {
    render(<AppShell>secret</AppShell>);
    expect(router.replace).toHaveBeenCalledWith("/");
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("shows the page, navigation and the user's email once signed in", async () => {
    signIn();
    render(<AppShell>page content</AppShell>);
    expect(await screen.findByText("page content")).toBeInTheDocument();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My documents" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/subject to legal review/);
  });

  it("marks My documents as current while viewing a saved document", () => {
    signIn();
    pathname = "/document/";
    render(<AppShell>page content</AppShell>);
    expect(screen.getByRole("link", { name: "My documents" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "New document" })).not.toHaveAttribute("aria-current");
    pathname = "/documents/";
  });

  it("signs out", async () => {
    signIn();
    const user = userEvent.setup();
    render(<AppShell>page content</AppShell>);
    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(getSession()).toBeNull();
    expect(router.push).toHaveBeenCalledWith("/");
  });
});

describe("SavedDocuments", () => {
  const names = { csa: "Cloud Service Agreement" };

  it("lists the user's documents with links to open them", async () => {
    signIn();
    fetchMock.mockReturnValue(
      reply(200, [{ id: 7, documentId: "csa", title: "Cloud Service Agreement · Acme", createdAt: "2026-11-14T15:30:00+00:00" }]),
    );
    render(<SavedDocuments names={names} />);
    const link = await screen.findByRole("link", { name: /Cloud Service Agreement · Acme/ });
    expect(link.getAttribute("href")).toMatch(/^\/document\/?\?id=7$/);
    expect(link).toHaveTextContent("Nov 14, 2026");
  });

  it("explains what to do when there are no documents yet", async () => {
    signIn();
    fetchMock.mockReturnValue(reply(200, []));
    render(<SavedDocuments names={names} />);
    expect(await screen.findByRole("heading", { name: "No documents yet" })).toBeInTheDocument();
  });
});

describe("SavedDocumentView", () => {
  it("rebuilds the saved document for preview and download", async () => {
    signIn();
    searchParams = new URLSearchParams("id=3");
    const fields = { ...defaultFormData(), governingLaw: "Delaware", jurisdiction: "New Castle, DE" };
    fields.party1 = { ...fields.party1, company: "Acme, Inc." };
    fields.party2 = { ...fields.party2, company: "Globex" };
    fetchMock.mockReturnValue(
      reply(200, { id: 3, documentId: NDA_ID, title: "Mutual NDA · Acme", createdAt: "2026-11-14T15:30:00+00:00", fields }),
    );
    render(<SavedDocumentView catalog={catalog} />);
    expect(await screen.findByRole("heading", { level: 1, name: "Mutual NDA · Acme" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/documents/3");
    expect(screen.getByRole("region", { name: "Cover Page" })).toHaveTextContent("Delaware");
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
    expect(screen.getByRole("note", { name: "Disclaimer" })).toBeInTheDocument();
  });

  it("shows a message for a document that does not exist", async () => {
    signIn();
    searchParams = new URLSearchParams("id=999");
    fetchMock.mockReturnValue(reply(404, { detail: "Document not found." }));
    render(<SavedDocumentView catalog={catalog} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't be found");
  });
});
