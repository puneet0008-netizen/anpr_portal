import { AlertTriangle, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmModalProps {
  open:       boolean
  onClose:    () => void
  onConfirm:  () => void
  loading?:   boolean
  title:      string
  message:    string
  variant?:   'danger' | 'warning'
  confirmLabel?: string
}

export const ConfirmModal = ({ open, onClose, onConfirm, loading, title, message, variant = 'danger', confirmLabel = 'Confirm' }: ConfirmModalProps) => (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent size="sm">
      <DialogHeader>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${variant === 'danger' ? 'bg-red-100' : 'bg-amber-100'}`}>
          {variant === 'danger'
            ? <Trash2 className="h-5 w-5 text-red-600" />
            : <AlertTriangle className="h-5 w-5 text-amber-600" />}
        </div>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{message}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          size="sm"
          variant={variant === 'danger' ? 'destructive' : 'default'}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? 'Processing…' : confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)
