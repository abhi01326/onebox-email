import React from "react";

export default function EmailHoverModal({ email, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-black"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold mb-2">{email.subject}</h2>
        <p className="text-sm text-gray-500 mb-4">
          From: {email.from} | {email.date}
        </p>

        <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-800 overflow-auto max-h-80 whitespace-pre-wrap">
          {email.body || "No content available."}
        </div>

        {email.aiCategory === "Interested" && (
          <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            Trigger Automation
          </button>
        )}
      </div>
    </div>
  );
}
