import React from "react";

export default function Filters({
  accounts,
  selectedAccount,
  setSelectedAccount,
  selectedFolder,
  setSelectedFolder,
  query,
  setQuery,
}) {
  const folders = [
  { label: "Inbox", value: "INBOX" },
  { label: "Sent", value: "[Gmail]/Sent Mail" },
  { label: "All Mail", value: "[Gmail]/All Mail" },
  { label: "Spam", value: "[Gmail]/Spam" },
];


  return (
    <div className="flex flex-wrap items-center gap-3 mb-6 bg-white p-4 rounded-xl shadow">
      <select
        value={selectedAccount}
        onChange={(e) => setSelectedAccount(e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm"
      >
        <option value="">All Accounts</option>
        {accounts.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.user}
          </option>
        ))}
      </select>

      <select
        value={selectedFolder}
        onChange={(e) => setSelectedFolder(e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm"
      >
        <option value="">All Folders</option>
        {folders.map((f) => (
          <option key={f.label} >{f.value}</option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Search subject..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="grow border rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
}
