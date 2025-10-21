import { setImapStatus, getImapStatus } from "../src/imap/imapService";
import { ImapManager } from "../src/imap/imapManager";

jest.mock("imapflow", () => {
  return {
    ImapFlow: jest.fn().mockImplementation(() => {
      const listeners: Record<string, Function[]> = {};
      return {
        connect: jest.fn().mockImplementation(() => Promise.resolve()),
        mailboxOpen: jest.fn().mockImplementation(() => Promise.resolve()),
        search: jest.fn().mockImplementation(() => Promise.resolve([])),
        fetch: jest.fn().mockImplementation(async function* () {}),
        on: (ev: string, cb: Function) => {
          listeners[ev] = listeners[ev] || [];
          listeners[ev].push(cb);
        },
        emit: (ev: string, ...args: any[]) => {
          (listeners[ev] || []).forEach((cb) => cb(...args));
        },
        logout: jest.fn().mockImplementation(() => Promise.resolve()),
        noop: jest.fn().mockImplementation(() => Promise.resolve()),
      };
    }),
  };
});

describe("IMAP status store", () => {
  it("should update status when setImapStatus is called", () => {
    const id = "test-account";
    setImapStatus(id, { connected: false });
    expect(getImapStatus(id).connected).toBe(false);
    setImapStatus(id, {
      connected: true,
      host: "imap.example.com",
      user: "us**",
    });
    const s = getImapStatus(id);
    expect(s.connected).toBe(true);
    expect(s.host).toBe("imap.example.com");
  });

  it("ImapManager should call setImapStatus on connect", async () => {
    // Ensure accounts config has at least one account for the manager to start
    // We will monkeypatch IMAP_ACCOUNTS import by setting process.env values used by config
    process.env.IMAP_1_HOST = "imap.example.com";
    process.env.IMAP_1_USER = "user@example.com";
    process.env.IMAP_1_PASS = "pass";

    // clear status
    const id = "test-account";
    setImapStatus(id, { connected: false });

    const manager = new ImapManager();
    await manager.start();

    // ImapManager uses ImapFlow mock which resolves connect, so status remains updated by ImapManager
    expect(getImapStatus(id).connected).toBe(true);
  });
});
