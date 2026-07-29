'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { FieldError } from '@/components/shared/field-error';
import { PillMultiSelect } from '@/components/forms/pill-multi-select';
import { cn } from '@/lib/utils';
import { campaignsApi } from '@/lib/api/campaigns';
import { toSmallestUnit, formatMoney } from '@/lib/money';
import { campaignWizardSchema, WIZARD_STEPS, type CampaignWizardValues } from '@/lib/validation/campaign';
import { COUNTRY_OPTIONS, DEVICE_OPTIONS, CATEGORY_OPTIONS, OS_OPTIONS } from '@/lib/constants/targeting';
import { ApiClientError } from '@/lib/api/errors';

// Fields that must be valid before the "Next" button on each step advances.
const STEP_FIELDS: Array<Array<keyof CampaignWizardValues | `creative.${string}`>> = [
  ['name'],
  ['creative.type', 'creative.assetUrl', 'creative.headline'],
  ['totalBudget', 'dailyBudget', 'bidAmount'],
  ['destinationUrl'],
  ['startDate', 'endDate'],
  [],
];

export function CampaignWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampaignWizardValues>({
    resolver: zodResolver(campaignWizardSchema),
    defaultValues: {
      creative: { type: 'text' },
      targetCountries: [],
      targetDevices: [],
      targetCategories: [],
      targetOs: [],
    },
  });

  const values = watch();

  const createMutation = useMutation({
    mutationFn: (values: CampaignWizardValues) =>
      campaignsApi.create({
        name: values.name,
        totalBudget: toSmallestUnit(values.totalBudget),
        dailyBudget: values.dailyBudget ? toSmallestUnit(values.dailyBudget) : undefined,
        bidAmount: toSmallestUnit(values.bidAmount),
        startDate: new Date(values.startDate).toISOString(),
        endDate: values.endDate ? new Date(values.endDate).toISOString() : undefined,
        targetCountries: values.targetCountries,
        targetDevices: values.targetDevices,
        targetCategories: values.targetCategories,
        targetOs: values.targetOs,
        destinationUrl: values.destinationUrl,
        creatives: [
          {
            type: values.creative.type,
            assetUrl: values.creative.assetUrl || undefined,
            headline: values.creative.headline || undefined,
            bodyText: values.creative.bodyText || undefined,
          },
        ],
      }),
    onSuccess: (campaign) => {
      router.push(`/advertiser/campaigns/${campaign.id}`);
    },
    onError: (err) => {
      setSubmitError(
        err instanceof ApiClientError ? err.message : 'Could not create the campaign. Please try again.'
      );
    },
  });

  const goNext = async () => {
    const fields = STEP_FIELDS[step] ?? [];
    const valid = fields.length === 0 || (await trigger(fields as Array<keyof CampaignWizardValues>));
    if (valid) setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = (values: CampaignWizardValues) => {
    setSubmitError(null);
    createMutation.mutate(values);
  };

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto">
        {WIZARD_STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                i === step
                  ? 'bg-primary text-primary-foreground'
                  : i < step
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                'whitespace-nowrap text-sm',
                i === step ? 'font-medium text-foreground' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
            {i < WIZARD_STEPS.length - 1 && <div className="h-px w-6 bg-border" aria-hidden="true" />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Campaign name</Label>
                  <Input id="name" className="mt-1.5" {...register('name')} />
                  <FieldError message={errors.name?.message} />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="creative-type">Creative type</Label>
                  <select
                    id="creative-type"
                    className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    {...register('creative.type')}
                  >
                    <option value="text">Text</option>
                    <option value="banner">Banner</option>
                    <option value="native">Native</option>
                    <option value="video">Video</option>
                  </select>
                </div>

                {values.creative?.type !== 'text' && values.creative?.type !== 'native' && (
                  <div>
                    <Label htmlFor="assetUrl">
                      {values.creative?.type === 'video' ? 'Video URL' : 'Banner image URL'}
                    </Label>
                    <Input
                      id="assetUrl"
                      placeholder="https://…"
                      className="mt-1.5"
                      {...register('creative.assetUrl')}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Paste a hosted image/video URL — there is no built-in file upload yet, so the asset needs to
                      be hosted somewhere first.
                    </p>
                    <FieldError message={errors.creative?.assetUrl?.message} />
                  </div>
                )}

                <div>
                  <Label htmlFor="headline">Headline {values.creative?.type === 'text' ? '' : '(optional)'}</Label>
                  <Input id="headline" maxLength={150} className="mt-1.5" {...register('creative.headline')} />
                  <FieldError message={errors.creative?.headline?.message} />
                </div>

                <div>
                  <Label htmlFor="bodyText">Body text (optional)</Label>
                  <Textarea id="bodyText" maxLength={500} className="mt-1.5" {...register('creative.bodyText')} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="totalBudget">Total budget (₦)</Label>
                  <Input id="totalBudget" type="number" step="0.01" className="mt-1.5" {...register('totalBudget')} />
                  <FieldError message={errors.totalBudget?.message} />
                </div>
                <div>
                  <Label htmlFor="dailyBudget">Daily budget (₦, optional)</Label>
                  <Input id="dailyBudget" type="number" step="0.01" className="mt-1.5" {...register('dailyBudget')} />
                  <FieldError message={errors.dailyBudget?.message} />
                </div>
                <div>
                  <Label htmlFor="bidAmount">Bid amount (₦)</Label>
                  <Input id="bidAmount" type="number" step="0.01" className="mt-1.5" {...register('bidAmount')} />
                  <FieldError message={errors.bidAmount?.message} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <Label>Countries</Label>
                  <p className="mb-2 text-xs text-muted-foreground">Leave empty to target everywhere.</p>
                  <PillMultiSelect
                    options={COUNTRY_OPTIONS}
                    value={values.targetCountries}
                    onChange={(v) => setValue('targetCountries', v)}
                  />
                </div>
                <div>
                  <Label>Devices</Label>
                  <p className="mb-2 text-xs text-muted-foreground">Leave empty to target all devices.</p>
                  <PillMultiSelect
                    options={DEVICE_OPTIONS}
                    value={values.targetDevices}
                    onChange={(v) => setValue('targetDevices', v as CampaignWizardValues['targetDevices'])}
                  />
                </div>
                <div>
                  <Label>Categories</Label>
                  <PillMultiSelect
                    options={CATEGORY_OPTIONS}
                    value={values.targetCategories}
                    onChange={(v) => setValue('targetCategories', v)}
                  />
                </div>
                <div>
                  <Label>Operating systems</Label>
                  <PillMultiSelect
                    options={OS_OPTIONS}
                    value={values.targetOs}
                    onChange={(v) => setValue('targetOs', v)}
                  />
                </div>
                <div>
                  <Label htmlFor="destinationUrl">Destination URL</Label>
                  <Input
                    id="destinationUrl"
                    placeholder="https://…"
                    className="mt-1.5"
                    {...register('destinationUrl')}
                  />
                  <FieldError message={errors.destinationUrl?.message} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="startDate">Start date</Label>
                  <Input id="startDate" type="datetime-local" className="mt-1.5" {...register('startDate')} />
                  <FieldError message={errors.startDate?.message} />
                </div>
                <div>
                  <Label htmlFor="endDate">End date (optional)</Label>
                  <Input id="endDate" type="datetime-local" className="mt-1.5" {...register('endDate')} />
                  <FieldError message={errors.endDate?.message} />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4 text-sm">
                <ReviewRow label="Name" value={values.name} />
                <ReviewRow
                  label="Creative"
                  value={`${values.creative?.type} — ${values.creative?.headline || values.creative?.assetUrl || '—'}`}
                />
                <ReviewRow
                  label="Total budget"
                  value={values.totalBudget ? formatMoney(toSmallestUnit(values.totalBudget)) : '—'}
                />
                <ReviewRow
                  label="Daily budget"
                  value={values.dailyBudget ? formatMoney(toSmallestUnit(values.dailyBudget)) : 'Not set'}
                />
                <ReviewRow
                  label="Bid amount"
                  value={values.bidAmount ? formatMoney(toSmallestUnit(values.bidAmount)) : '—'}
                />
                <ReviewRow
                  label="Countries"
                  value={values.targetCountries.length ? values.targetCountries.join(', ') : 'All'}
                />
                <ReviewRow
                  label="Devices"
                  value={values.targetDevices.length ? values.targetDevices.join(', ') : 'All'}
                />
                <ReviewRow label="Destination" value={values.destinationUrl} />
                <ReviewRow
                  label="Start date"
                  value={values.startDate ? new Date(values.startDate).toLocaleString() : '—'}
                />
                <ReviewRow
                  label="End date"
                  value={values.endDate ? new Date(values.endDate).toLocaleString() : 'No end date'}
                />

                {submitError && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                    {submitError}
                  </p>
                )}
              </div>
            )}

            <div className="mt-8 flex justify-between border-t border-border pt-6">
              <Button type="button" variant="outline" onClick={goBack} disabled={step === 0}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>

              {step < WIZARD_STEPS.length - 1 ? (
                <Button type="button" onClick={goNext}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating…' : 'Create campaign'}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
