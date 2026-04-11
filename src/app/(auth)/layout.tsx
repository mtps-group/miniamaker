export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full animate-pulse-glow pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)',
          top: '-150px', left: '-150px', filter: 'blur(80px)'
        }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full animate-pulse-glow pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)',
          bottom: '-100px', right: '-100px', filter: 'blur(80px)',
          animationDelay: '1.5s'
        }}
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />
      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {children}
      </div>
    </div>
  )
}
