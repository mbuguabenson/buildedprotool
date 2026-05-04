// Premium UI Components - Neumorphism + Glassmorphism
'use client'

import React from 'react'

// ==================== GLASS CARD ====================
export interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hoverable?: boolean
  active?: boolean
  onClick?: () => void
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverable = true,
  active = false,
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`glass-card ${hoverable ? 'hover:shadow-lg' : ''} ${active ? 'active' : ''} ${className}`}
  >
    {children}
  </div>
)

// ==================== GLASS PANEL ====================
export interface GlassPanelProps {
  children: React.ReactNode
  className?: string
  title?: string
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  children,
  className = '',
  title,
}) => (
  <div className={`glass-panel ${className}`}>
    {title && <h3 className="text-xl font-bold mb-4 glow-text-blue">{title}</h3>}
    {children}
  </div>
)

// ==================== NEOMORPH BUTTON ====================
export interface NeomorphButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'primary' | 'success' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export const NeomorphButton: React.FC<NeomorphButtonProps> = ({
  children,
  onClick,
  variant = 'default',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
}) => {
  const sizeClass = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-3.5 text-lg',
  }[size]

  const variantClass = {
    default: 'neomorph-button',
    primary: 'neomorph-button primary',
    success: 'neomorph-button bg-gradient-to-b from-green-600 to-green-700',
    danger: 'neomorph-button bg-gradient-to-b from-red-600 to-red-700',
  }[variant]

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${variantClass} ${sizeClass} font-semibold rounded-lg transition-all duration-200 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {children}
    </button>
  )
}

// ==================== TOGGLE SWITCH ====================
export interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
}) => (
  <div className="flex items-center gap-3">
    {label && <label className="text-sm font-medium">{label}</label>}
    <button
      onClick={() => onChange(!checked)}
      className={`toggle-switch ${checked ? 'on' : ''}`}
      aria-pressed={checked}
    />
  </div>
)

// ==================== STAT PILL ====================
export interface StatPillProps {
  label: string
  value: string | number
  variant?: 'default' | 'positive' | 'negative' | 'warning'
  suffix?: string
  icon?: React.ReactNode
}

export const StatPill: React.FC<StatPillProps> = ({
  label,
  value,
  variant = 'default',
  suffix,
  icon,
}) => {
  const valueClass = {
    default: 'stat-value',
    positive: 'stat-value positive',
    negative: 'stat-value negative',
    warning: 'stat-value',
  }[variant]

  return (
    <div className="stat-pill">
      {icon && <div className="mb-2">{icon}</div>}
      <div className="stat-label">{label}</div>
      <div className={valueClass}>
        {value}
        {suffix && <span className="text-sm ml-1">{suffix}</span>}
      </div>
    </div>
  )
}

// ==================== POWER BAR ====================
export interface PowerBarProps {
  label: string
  value: number // 0-100
  color?: 'green' | 'amber' | 'red' | 'purple' | 'blue'
  showLabel?: boolean
  animated?: boolean
}

export const PowerBar: React.FC<PowerBarProps> = ({
  label,
  value,
  color = 'blue',
  showLabel = true,
  animated = true,
}) => {
  const colorClass = {
    green: 'power-fill green',
    amber: 'power-fill amber',
    red: 'power-fill red',
    purple: 'power-fill purple',
    blue: 'power-fill',
  }[color]

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-text-secondary">{label}</label>
        {showLabel && <span className="text-xs font-semibold text-text-tertiary">{value.toFixed(1)}%</span>}
      </div>
      <div className="power-bar">
        <div
          className={`${colorClass} ${animated ? 'transition-all duration-500' : ''}`}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        >
          <div className="power-label">{value.toFixed(0)}%</div>
        </div>
      </div>
    </div>
  )
}

// ==================== INPUT FIELD ====================
export interface InputFieldProps {
  label?: string
  value: string | number
  onChange: (value: string) => void
  type?: 'text' | 'number' | 'email' | 'password'
  placeholder?: string
  disabled?: boolean
  suffix?: string
  prefix?: string
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
  suffix,
  prefix,
}) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium mb-2">{label}</label>}
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-3 text-text-tertiary font-medium">{prefix}</span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`input-field w-full ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-8' : ''}`}
      />
      {suffix && (
        <span className="absolute right-3 text-text-tertiary font-medium">{suffix}</span>
      )}
    </div>
  </div>
)

// ==================== GLOW BADGE ====================
export interface GlowBadgeProps {
  children: React.ReactNode
  color?: 'blue' | 'purple' | 'green' | 'amber' | 'red'
  size?: 'sm' | 'md' | 'lg'
}

export const GlowBadge: React.FC<GlowBadgeProps> = ({
  children,
  color = 'blue',
  size = 'md',
}) => {
  const colorClasses = {
    blue: 'bg-blue-500/20 border-blue-400/50 text-blue-200 glow-text-blue',
    purple: 'bg-purple-500/20 border-purple-400/50 text-purple-200 glow-text-purple',
    green: 'bg-green-500/20 border-green-400/50 text-green-200 glow-text-green',
    amber: 'bg-amber-500/20 border-amber-400/50 text-amber-200',
    red: 'bg-red-500/20 border-red-400/50 text-red-200',
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  return (
    <div
      className={`${colorClasses[color]} ${sizeClasses[size]} border rounded-full font-semibold inline-block`}
    >
      {children}
    </div>
  )
}

// ==================== LOADING SPINNER ====================
export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({
  size = 'md',
}) => {
  const sizeClass = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }[size]

  return (
    <div className={`${sizeClass} border-4 border-transparent border-t-blue-500 rounded-full animate-spin`} />
  )
}

// ==================== STAT GRID ====================
export interface StatGridItem {
  label: string
  value: string | number
  variant?: 'default' | 'positive' | 'negative' | 'warning'
  suffix?: string
}

export interface StatGridProps {
  items: StatGridItem[]
  columns?: 2 | 3 | 4
}

export const StatGrid: React.FC<StatGridProps> = ({ items, columns = 3 }) => {
  const gridClass = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns]

  return (
    <div className={`grid ${gridClass} gap-4 w-full`}>
      {items.map((item, idx) => (
        <StatPill
          key={idx}
          label={item.label}
          value={item.value}
          variant={item.variant}
          suffix={item.suffix}
        />
      ))}
    </div>
  )
}

// ==================== TRADE CARD ====================
export interface TradeCardProps {
  digit: number
  amount: number
  result: 'win' | 'loss' | 'pending'
  time: string
  bot: string
}

export const TradeCard: React.FC<TradeCardProps> = ({
  digit,
  amount,
  result,
  time,
  bot,
}) => {
  const resultColor = {
    win: 'border-l-green-500 bg-green-500/10',
    loss: 'border-l-red-500 bg-red-500/10',
    pending: 'border-l-amber-500 bg-amber-500/10',
  }[result]

  const amountColor = result === 'win' ? 'text-green-400' : result === 'loss' ? 'text-red-400' : 'text-amber-400'

  return (
    <div className={`glass-card border-l-4 ${resultColor} flex justify-between items-center p-3`}>
      <div className="flex gap-3 items-center">
        <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center font-bold text-lg">
          {digit}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{bot}</span>
          <span className="text-xs text-text-tertiary">{time}</span>
        </div>
      </div>
      <span className={`${amountColor} font-bold text-lg`}>
        {result === 'win' ? '+' : result === 'loss' ? '-' : ''} ${amount}
      </span>
    </div>
  )
}
