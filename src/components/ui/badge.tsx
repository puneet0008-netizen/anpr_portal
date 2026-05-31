import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-brand/10 text-brand border-brand/20',
        secondary:   'bg-gray-100 text-gray-700 border-gray-200',
        destructive: 'bg-red-100 text-red-700 border-red-200',
        success:     'bg-green-100 text-green-700 border-green-200',
        warning:     'bg-amber-100 text-amber-700 border-amber-200',
        outline:     'text-gray-600 border-gray-300 bg-transparent',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
)

export { Badge, badgeVariants }
