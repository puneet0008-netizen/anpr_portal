import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { LucideIcon } from 'lucide-react'

interface Action { label: string; icon?: LucideIcon; onClick: () => void; variant?: 'default' | 'outline' | 'secondary' }

interface PageHeaderProps {
  title:    string
  subtitle?: string
  actions?:  Action[]
  action?:   ReactNode
  children?: ReactNode
}

export const PageHeader = ({ title, subtitle, actions, action, children }: PageHeaderProps) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
    <div className="min-w-0">
      <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{title}</h1>
      {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {(children || action || (actions && actions.length > 0)) && (
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        {children}
        {action}
        {actions?.map((a) => (
          <Button key={a.label} variant={a.variant ?? 'default'} size="sm" onClick={a.onClick}>
            {a.icon && <a.icon className="h-4 w-4" />}
            {a.label}
          </Button>
        ))}
      </div>
    )}
  </div>
)
