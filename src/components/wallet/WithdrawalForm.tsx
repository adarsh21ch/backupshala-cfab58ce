import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/format';

export interface WithdrawalPayload {
  method: 'upi' | 'bank';
  amount: string;
  upiId: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  confirmAccount: string;
  ifscCode: string;
}

interface WithdrawalFormProps {
  availableBalance: number;
  submitting: boolean;
  onSubmit: (payload: WithdrawalPayload) => void;
  onCancel?: () => void;
}

const WithdrawalForm = ({ availableBalance, submitting, onSubmit }: WithdrawalFormProps) => {
  const [method, setMethod] = useState<'upi' | 'bank'>('upi');
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  const amt = Number(amount);
  const disabled = submitting || amt < 500 || amt > availableBalance;

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Available Balance: <span className="font-semibold text-foreground">{formatPrice(availableBalance)}</span>
      </div>

      <div>
        <Label>Amount to withdraw (₹)</Label>
        <Input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder={`Min ₹500, Max ₹${Math.round(availableBalance)}`}
          min={500}
          max={availableBalance}
          className="mt-1"
        />
        {Number(amount) > 0 && Number(amount) < 500 && (
          <p className="text-xs text-destructive mt-1">Minimum withdrawal is ₹500</p>
        )}
      </div>

      <div>
        <Label>Payment Method</Label>
        <div className="flex gap-2 mt-1">
          <button
            type="button"
            onClick={() => setMethod('upi')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors min-h-[44px] flex-1 sm:flex-none ${method === 'upi' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
          >
            UPI
          </button>
          <button
            type="button"
            onClick={() => setMethod('bank')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors min-h-[44px] flex-1 sm:flex-none ${method === 'bank' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
          >
            Bank Transfer
          </button>
        </div>
      </div>

      {method === 'upi' ? (
        <div>
          <Label>UPI ID</Label>
          <Input value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi" className="mt-1" />
        </div>
      ) : (
        <div className="space-y-3">
          <div><Label>Account Holder Name</Label><Input value={accountHolder} onChange={e => setAccountHolder(e.target.value)} className="mt-1" /></div>
          <div><Label>Account Number</Label><Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="mt-1" /></div>
          <div><Label>Confirm Account Number</Label><Input value={confirmAccount} onChange={e => setConfirmAccount(e.target.value)} className="mt-1" /></div>
          <div><Label>IFSC Code</Label><Input value={ifscCode} onChange={e => setIfscCode(e.target.value.toUpperCase())} className="mt-1" /></div>
          <div><Label>Bank Name</Label><Input value={bankName} onChange={e => setBankName(e.target.value)} className="mt-1" /></div>
        </div>
      )}

      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
        <p className="text-xs text-muted-foreground">
          Withdrawals are processed within 3-5 business days. You'll receive a notification once processed.
        </p>
      </div>

      <Button
        onClick={() => onSubmit({ method, amount, upiId, bankName, accountHolder, accountNumber, confirmAccount, ifscCode })}
        disabled={disabled}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold min-h-[44px] sticky bottom-0"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request Withdrawal'}
      </Button>
    </div>
  );
};

export default WithdrawalForm;
