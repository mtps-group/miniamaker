'use client'

import { cn } from '@/lib/utils'
import { useState } from 'react'

interface Tab {
  value: string
  label: string
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  defaultValue?: string
  onChange?: (value: string) => void
  className?: string
}

export default function Tabs({ tabs, defaultValue, onChange, className }: TabsProps) {
  const [active, setActive] = useState(defaultValue || tabs[0]?.value)

  const handleChange = (value: string) => {
    setActive(value)
    onChange?.(value)
  }

  return (
    <div className={cn('flex gap-1 p-1 bg-gray-100 rounded-lg', className)}>
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => handleChange(tab.value)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-all',
            active === tab.value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={cn(
              'ml-1.5 px-1.5 py-0.5 text-xs rounded-full',
              active === tab.value ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
