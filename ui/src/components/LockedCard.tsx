import type React from "react"

const LockIcon = () => (
  <svg className="w-20 h-20 text-gray-300 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
      clipRule="evenodd"
    />
  </svg>
)

export const LockedCard: React.FC = () => (
  <div className="h-[900px] bg-gradient-to-br from-gray-900/60 to-gray-800/40 border-2 border-gray-600/30 rounded-2xl flex items-center justify-center card-depth backdrop-blur-sm relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-gray-700/10 to-transparent"></div>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(100,100,100,0.1)_0%,transparent_70%)]"></div>

    <div className="relative z-10 flex flex-col items-center gap-8 opacity-70">
      <div className="w-40 h-40 bg-gradient-to-br from-gray-700/60 to-gray-800/40 rounded-3xl flex items-center justify-center border-2 border-gray-600/40 shadow-2xl backdrop-blur-sm">
        <LockIcon />
      </div>
      <div className="text-4xl tracking-[0.4em] font-bold text-gray-300 drop-shadow-lg">LOCKED</div>
    </div>
  </div>
)
