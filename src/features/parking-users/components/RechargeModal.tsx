import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { FormField } from '@/components/shared/FormField'
import { formatCurrency } from '@/lib/utils'
import type { AppUser, RechargeDto } from '@/types'

const schema = z.object({
  amount:         z.coerce.number().min(1, 'Enter amount'),
  paymentMethod:  z.enum(['Cash', 'UPI', 'Card']),
  transactionRef: z.string().min(1, 'Enter reference'),
})

interface RechargeModalProps {
  open:     boolean
  onClose:  () => void
  onSubmit: (d: RechargeDto) => void
  loading?: boolean
  user?:    AppUser
}

export const RechargeModal = ({ open, onClose, onSubmit, loading, user }: RechargeModalProps) => {
  const { register, handleSubmit, control, formState: { errors } } = useForm<RechargeDto>({
    resolver: zodResolver(schema),
    defaultValues: { paymentMethod: 'Cash' },
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Recharge Wallet</DialogTitle>
          {user && (
            <p className="text-xs text-gray-500 mt-1">
              {user.name} · Current balance: <span className="font-semibold text-green-700">{formatCurrency(user.walletBalance)}</span>
            </p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          <FormField label="Amount (₹)" error={errors.amount?.message} required>
            <Input type="number" placeholder="500" {...register('amount')} />
          </FormField>
          <FormField label="Payment Method" error={errors.paymentMethod?.message} required>
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Cash', 'UPI', 'Card'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Transaction Reference" error={errors.transactionRef?.message} required>
            <Input placeholder="UTR / Receipt No." {...register('transactionRef')} />
          </FormField>
          <DialogFooter className="px-0 pt-2 border-0">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={loading}>{loading ? 'Processing…' : 'Recharge'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
