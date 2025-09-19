"use client"

import type React from "react"

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
}

const Icons = {
  Warning: () => (
    <svg className="text-white text-3xl w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
      <path
        fillRule="evenodd"
        d="M10 5a2 2 0 00-2 2v6a2 2 0 002 2h4a2 2 0 002-2V7a2 2 0 00-2-2H10zM8.5 7a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v6a.5.5 0 01-.5.5h-2a.5.5 0 01-.5-.5V7z"
        clipRule="evenodd"
      />
    </svg>
  ),
}

export const ConfirmModal: React.FC<Props> = ({ open, onClose, onConfirm, title, message }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-red-500/50 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-red-500/20">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent rounded-2xl"></div>

        <div className="relative z-10">
          {/* Danger Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50">
              <Icons.Warning />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-red-400 text-center mb-4">{title}</h2>

          {/* Message */}
          <p className="text-gray-300 text-center mb-8 leading-relaxed">{message}</p>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 border border-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-red-500/30 flex items-center justify-center"
            >
              <Icons.Trash />
              <span className="ml-2">DELETE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
