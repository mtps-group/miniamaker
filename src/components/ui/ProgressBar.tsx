import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max: number
  className?: string
  color?: 'red' | 'green' | 'yellow' | 'blue'
  showLabel?: boolean
}

export default function ProgressBar({ value, max, className, color = 'red', showLabel = false }: ProgressBarProps) {
  const percentage = Math.min(Math.round((value / max) * 100), 100)

  const colors = {
    red: 'bg-gradient-to-r from-red-600 to-red-500',
    green: 'bg-gradient-to-r from-green-600 to-green-500',
    yellow: 'bg-gradient-to-r from-yellow-600 to-yellow-500',
    blue: 'bg-gradient-to-r from-blue-600 to-blue-500',
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs text-gray-500 text-right">{percentage}%</p>
      )}
    </div>
  )
}
