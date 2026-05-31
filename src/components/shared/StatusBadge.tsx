import { Badge } from '@/components/ui/badge'

const MAP: Record<string, 'success' | 'secondary' | 'warning' | 'destructive' | 'default'> = {
  active:      'success',
  inactive:    'secondary',
  suspended:   'destructive',
  pending:     'warning',
  critical:    'destructive',
  'low stock': 'warning',
  'low':       'warning',
  'in stock':  'success',
  maintenance: 'warning',
}

export const StatusBadge = ({ status }: { status: string }) => (
  <Badge variant={MAP[status.toLowerCase()] ?? 'secondary'}>
    {status}
  </Badge>
)
