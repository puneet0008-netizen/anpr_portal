import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface FormFieldProps {
  label:    string
  error?:   string
  required?: boolean
  children:  ReactNode
  className?: string
}

export const FormField = ({ label, error, required, children, className }: FormFieldProps) => (
  <div className={cn('flex flex-col gap-1.5', className)}>
    <Label>
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
    {children}
    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
)
