import { useState } from 'react';
import { useStripePayments, StripeCustomerData, StripePayment } from '@/hooks/useStripePayments';
import { useClientSettings, useUpdateClientSettings } from '@/hooks/useClientSettings';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { CreditCard, DollarSign, FileText, Send, RefreshCw, Link2, Loader2, ExternalLink, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { format } from 'date-fns';

interface ClientBillingTabProps {
  clientId: string;
  clientName: string;
}

export function ClientBillingTab({ clientId, clientName }: ClientBillingTabProps) {
  const { data: settings } = useClientSettings(clientId);
  const updateSettings = useUpdateClientSettings();
  
  const stripeEmail = (settings as any)?.stripe_email || '';
  const stripeCustomerId = (settings as any)?.stripe_customer_id || '';
  
  const { data: stripeData, isLoading, refetch } = useStripePayments(stripeCustomerId || stripeEmail || null);

  // Link account state
  const [linkEmail, setLinkEmail] = useState('');
  const [linkCustomerId, setLinkCustomerId] = useState('');
  const [linking, setLinking] = useState(false);

  // Invoice creation state
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDescription, setInvoiceDescription] = useState('');
  const [invoiceDays, setInvoiceDays] = useState('30');
  const [sendingInvoice, setSendingInvoice] = useState(false);

  // Direct charge state
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDescription, setChargeDescription] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('default');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [submittingCharge, setSubmittingCharge] = useState(false);

  const isLinked = !!(stripeData?.customer);

  const handleLinkAccount = async () => {
    if (!linkEmail && !linkCustomerId) {
      toast.error('Enter a billing email or Stripe Customer ID');
      return;
    }
    setLinking(true);
    try {
      // If customer ID provided, validate it; else search by email
      let resolvedCustomerId = linkCustomerId;
      let resolvedEmail = linkEmail;

      if (linkCustomerId && linkCustomerId.startsWith('cus_')) {
        resolvedCustomerId = linkCustomerId;
      } else if (linkEmail) {
        const { data } = await supabase.functions.invoke('stripe-payments', {
          body: { email: linkEmail, action: 'search-customer' },
        });
        if (data?.customer) {
          resolvedCustomerId = data.customer.id;
          resolvedEmail = data.customer.email;
        } else {
          toast.error(`No Stripe customer found for ${linkEmail}`);
          return;
        }
      }

      await updateSettings.mutateAsync({
        client_id: clientId,
        stripe_customer_id: resolvedCustomerId || null,
        stripe_email: resolvedEmail || null,
      } as any);

      toast.success('Stripe account linked!');
      refetch();
    } catch (err: any) {
      console.error('Link error:', err);
      toast.error('Failed to link Stripe account');
    } finally {
      setLinking(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!stripeData?.customer?.id) {
      toast.error('No Stripe customer linked');
      return;
    }
    const amt = parseFloat(invoiceAmount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSendingInvoice(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-payments', {
        body: {
          action: 'create-invoice',
          customerId: stripeData.customer.id,
          amount: amt,
          description: invoiceDescription || `Invoice for ${clientName}`,
          daysUntilDue: parseInt(invoiceDays) || 30,
        },
      });
      if (error) throw error;
      toast.success(`Invoice #${data.invoice.number} sent!`);
      setInvoiceOpen(false);
      setInvoiceAmount('');
      setInvoiceDescription('');
      refetch();
    } catch (err: any) {
      console.error('Invoice error:', err);
      toast.error('Failed to create invoice');
    } finally {
      setSendingInvoice(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
      succeeded: { variant: 'default', icon: CheckCircle },
      active: { variant: 'default', icon: CheckCircle },
      paid: { variant: 'default', icon: CheckCircle },
      failed: { variant: 'destructive', icon: XCircle },
      pending: { variant: 'secondary', icon: Clock },
      open: { variant: 'outline', icon: Clock },
      draft: { variant: 'outline', icon: FileText },
      void: { variant: 'secondary', icon: XCircle },
      uncollectible: { variant: 'destructive', icon: XCircle },
    };
    const config = map[status] || { variant: 'outline' as const, icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number, currency = 'usd') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount);

  // ── Not linked yet ──
  if (!isLinked && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Stripe Account
          </CardTitle>
          <CardDescription>
            Connect this client to their Stripe customer to track subscriptions and payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Billing Email</Label>
              <Input
                placeholder="client@example.com"
                value={linkEmail}
                onChange={(e) => setLinkEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">We'll search Stripe for a customer with this email</p>
            </div>
            <div>
              <Label>Stripe Customer ID (optional)</Label>
              <Input
                placeholder="cus_xxxxxxxxxxxxx"
                value={linkCustomerId}
                onChange={(e) => setLinkCustomerId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Takes priority over email if provided</p>
            </div>
          </div>
          <Button onClick={handleLinkAccount} disabled={linking}>
            {linking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
            Link Account
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Linked – show billing dashboard ──
  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <CreditCard className="h-4 w-4" /> Customer
            </div>
            <p className="text-lg font-bold mt-1">{stripeData?.customer?.name || stripeData?.customer?.email}</p>
            <p className="text-xs text-muted-foreground">{stripeData?.customer?.id}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" /> Stripe MRR
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stripeData?.mrr || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" /> Total Paid
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stripeData?.totalPaid || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <FileText className="h-4 w-4" /> Subscriptions
            </div>
            <p className="text-2xl font-bold mt-1">{stripeData?.subscriptions?.length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
        <Button size="sm" onClick={() => setInvoiceOpen(true)}>
          <Send className="h-4 w-4 mr-2" /> Create Invoice
        </Button>
        {stripeData?.customer?.id && (
          <Button size="sm" variant="default" onClick={async () => {
            setChargeOpen(true);
            setChargeAmount('');
            setChargeDescription('');
            setSelectedPaymentMethod('default');
            setPaymentMethods([]);
            setLoadingMethods(true);
            try {
              const { data } = await supabase.functions.invoke('stripe-payments', {
                body: { action: 'list-payment-methods', customerId: stripeData.customer!.id },
              });
              setPaymentMethods(data?.payment_methods || []);
            } catch {
            } finally {
              setLoadingMethods(false);
            }
          }}>
            <Zap className="h-4 w-4 mr-2" /> Direct Charge
          </Button>
        )}
      </div>

      {/* Subscriptions */}
      {(stripeData?.subscriptions?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subscription</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stripeData?.subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-mono text-xs">{sub.id}</TableCell>
                    <TableCell>
                      {sub.items.map((item, i) => (
                        <span key={i}>{formatCurrency(item.unit_amount * item.quantity, item.currency)}</span>
                      ))}
                    </TableCell>
                    <TableCell>{sub.items[0]?.interval || '—'}</TableCell>
                    <TableCell>{format(new Date(sub.current_period_end), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{statusBadge(sub.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {(stripeData?.payments?.length || 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No payments found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stripeData?.payments.slice(0, 25).map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.created), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(payment.amount, payment.currency)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{payment.description || '—'}</TableCell>
                    <TableCell>{statusBadge(payment.status)}</TableCell>
                    <TableCell>
                      {payment.receipt_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={payment.receipt_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invoice for {clientName}</DialogTitle>
            <DialogDescription>
              This will create and send a Stripe invoice to {stripeData?.customer?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="500.00"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                placeholder="Ad spend overage for January"
                value={invoiceDescription}
                onChange={(e) => setInvoiceDescription(e.target.value)}
              />
            </div>
            <div>
              <Label>Days Until Due</Label>
              <Input
                type="number"
                min="1"
                value={invoiceDays}
                onChange={(e) => setInvoiceDays(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateInvoice} disabled={sendingInvoice}>
              {sendingInvoice ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Send Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Direct Charge Dialog */}
      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Direct Charge — {clientName}</DialogTitle>
            <DialogDescription>
              Charge the client's payment method on file immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Amount ($)</Label>
              <Input type="number" min="0" step="0.01" placeholder="500.00" value={chargeAmount} onChange={e => setChargeAmount(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Input placeholder="Ad spend overage" value={chargeDescription} onChange={e => setChargeDescription(e.target.value)} />
            </div>
            <div>
              <Label>Payment Method</Label>
              {loadingMethods ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading methods...
                </div>
              ) : (
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default on file</SelectItem>
                    {paymentMethods.map(pm => (
                      <SelectItem key={pm.id} value={pm.id}>
                        <span className="flex items-center gap-2">
                          <CreditCard className="h-3 w-3" />
                          {pm.brand?.toUpperCase()} ••••{pm.last4} ({pm.exp_month}/{pm.exp_year})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeOpen(false)}>Cancel</Button>
            <Button disabled={submittingCharge} onClick={async () => {
              const amt = parseFloat(chargeAmount);
              if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
              if (!stripeData?.customer?.id) return;
              setSubmittingCharge(true);
              try {
                const body: any = {
                  action: 'create-charge',
                  customerId: stripeData.customer.id,
                  amount: amt,
                  description: chargeDescription || `Charge for ${clientName}`,
                };
                if (selectedPaymentMethod !== 'default') {
                  body.paymentMethodId = selectedPaymentMethod;
                }
                const { data, error } = await supabase.functions.invoke('stripe-payments', { body });
                if (error) throw error;
                const pm = data.payment?.payment_method;
                const pmLabel = pm ? ` (${pm.brand?.toUpperCase()} ••••${pm.last4})` : '';
                if (data.payment.status === 'succeeded') {
                  toast.success(`Payment of ${formatCurrency(amt)} succeeded${pmLabel}`);
                } else {
                  toast.warning(`Payment status: ${data.payment.status}${pmLabel}`);
                }
                setChargeOpen(false);
                refetch();
              } catch (err: any) {
                toast.error(err.message || 'Charge failed');
              } finally {
                setSubmittingCharge(false);
              }
            }}>
              {submittingCharge ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Charge Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
