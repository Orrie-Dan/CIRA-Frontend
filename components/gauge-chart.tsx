'use client'

import React from 'react'

interface GaugeChartProps {
  value: number // 0-100
  label: string
  size?: number
  strokeWidth?: number
  showValue?: boolean
}

export function GaugeChart({ 
  value, 
  label, 
  size = 200, 
  strokeWidth = 20,
  showValue = true 
}: GaugeChartProps) {
  const percentage = Math.min(Math.max(value, 0), 100)
  const centerX = size / 2
  const centerY = size / 2
  const radius = (size - strokeWidth) / 2
  const circumference = Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  // Color based on value
  const getColor = (val: number) => {
    if (val >= 80) return '#10b981' // green
    if (val >= 50) return '#eab308' // yellow
    return '#ef4444' // red
  }

  const color = getColor(percentage)

  // Calculate start and end points for semicircle (180 degrees)
  const startAngle = Math.PI // 180 degrees
  const endAngle = 0 // 0 degrees
  const startX = centerX + radius * Math.cos(startAngle)
  const startY = centerY + radius * Math.sin(startAngle)
  const endX = centerX + radius * Math.cos(endAngle)
  const endY = centerY + radius * Math.sin(endAngle)

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size / 2 + 30 }}>
        <svg
          width={size}
          height={size / 2 + 30}
          viewBox={`0 0 ${size} ${size / 2 + 30}`}
          className="overflow-visible"
        >
          {/* Background arc (semicircle) */}
          <path
            d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
            fill="none"
            stroke="#334155"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        {showValue && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ paddingTop: size / 2 - 10 }}
          >
            <div className="text-3xl font-bold" style={{ color }}>
              {Math.round(percentage)}%
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm font-medium text-slate-300 truncate max-w-[180px]" title={label}>
          {label}
        </p>
      </div>
    </div>
  )
}

