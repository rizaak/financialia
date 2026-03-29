import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import type { ComponentPropsWithoutRef, HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = ({ className, ...props }: ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Overlay
>) => (
  <AlertDialogPrimitive.Overlay
    className={cn('fixed inset-0 z-[100] bg-zinc-950/40 backdrop-blur-sm', className)}
    {...props}
  />
);

const AlertDialogContent = ({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      className={cn(
        'fixed left-1/2 top-1/2 z-[101] grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-xl outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </AlertDialogPrimitive.Content>
  </AlertDialogPortal>
);

const AlertDialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)} {...props} />
);

const AlertDialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3', className)}
    {...props}
  />
);

const AlertDialogTitle = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>) => (
  <AlertDialogPrimitive.Title className={cn('text-base font-semibold text-zinc-900', className)} {...props} />
);

const AlertDialogDescription = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>) => (
  <AlertDialogPrimitive.Description
    className={cn('text-sm text-zinc-600', className)}
    {...props}
  />
);

const AlertDialogCancel = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>) => (
  <AlertDialogPrimitive.Cancel
    className={cn(
      'inline-flex h-9 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600',
      className,
    )}
    {...props}
  />
);

const AlertDialogAction = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>) => (
  <AlertDialogPrimitive.Action
    className={cn(
      'inline-flex h-9 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white shadow hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700',
      className,
    )}
    {...props}
  />
);

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
};
