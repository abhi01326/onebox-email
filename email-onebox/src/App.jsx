import React, { useEffect, useState } from "react";
import Filters from "./components/Filters";
import EmailList from "./components/EmailList";
import EmailHoverModal from "./components/EmailHoverModal";

const API_BASE = "http://localhost:4000/api";

export default function App() {
  const [accounts, setAccounts] = useState([]);
  const [emails, setEmails] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/accounts`)
      .then((res) => res.json())
      .then(data=>{
        setAccounts(data.accounts);
      })
      .catch(console.error);
  }, []);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      if (selectedAccount) params.append("accountId", selectedAccount);
      if (selectedFolder) params.append("folder", selectedFolder);

      const res = await fetch(`${API_BASE}/emails/search?${params.toString()}`);
      const data = await res.json();
      console.log("Fetched emails:", data);
      setEmails([...data]);
    } catch (err) {
      console.error("Error fetching emails:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, [query, selectedAccount, selectedFolder]);

  console.log("Rendered with emails:", emails);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="p-4 bg-indigo-600 text-white font-semibold text-xl shadow-md">
        Email Intelligence Dashboard
      </header>

      <main className="p-4 max-w-5xl mx-auto">
        <Filters
          accounts={accounts}
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
          selectedFolder={selectedFolder}
          setSelectedFolder={setSelectedFolder}
          query={query}
          setQuery={setQuery}
        />

        {loading ? (
          <p className="text-center text-gray-500 mt-10">Loading emails...</p>
        ) : (
          <EmailList emails={emails} onEmailClick={setSelectedEmail} />
        )}
      </main>

      {selectedEmail && (
        <EmailHoverModal
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
        />
      )}
    </div>
  );
}
