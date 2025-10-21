import React from "react";

export default function EmailList({ emails, onEmailClick }) {
  if (!emails.length)
    return <p className="text-center text-gray-500 mt-10">No emails found.</p>;

  return (
    <div className="space-y-3">
      {emails.map((hit) => {
        const email = hit._source || hit; // elasticsearch vs plain
        return (
          <div
            key={email.id}
            className="bg-white rounded-xl p-4 shadow hover:shadow-lg transition cursor-pointer flex justify-between"
            onClick={() => onEmailClick(email)}
          >
            <div>
              <p className="font-semibold text-gray-800">{email.subject}</p>
              <p className="text-sm text-gray-500">{email.from}</p>
              <p className="text-xs text-gray-400">{email.date}</p>
            </div>

            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center justify-center ${
                email.aiCategory === "Interested"
                  ? "bg-green-100 text-green-700"
                  : email.aiCategory === "Meeting Booked"
                  ? "bg-blue-100 text-blue-700"
                  : email.aiCategory === "Not Interested"
                  ? "bg-red-100 text-red-700"
                  : email.aiCategory === "Spam"
                  ? "bg-gray-200 text-gray-600"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {email.aiCategory || "Uncategorized"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
