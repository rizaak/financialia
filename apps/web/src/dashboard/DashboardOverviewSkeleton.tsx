import { Card, CardContent, Skeleton, Stack } from '@mui/material';

function CardSkeleton() {
  return (
    <Card variant="outlined" className="col-span-12 sm:col-span-6 xl:col-span-3 h-full" sx={{ borderRadius: 2 }}>
      <CardContent className="p-4 sm:p-5">
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={24} width="55%" />
          <Skeleton variant="text" height={40} width="80%" />
        </Stack>
      </CardContent>
    </Card>
  );
}

export function DashboardOverviewSkeleton() {
  return (
    <>
      <Card variant="outlined" className="col-span-12" sx={{ borderRadius: 2 }}>
        <CardContent className="p-4 sm:p-5">
          <Stack direction="row" spacing={2} alignItems="center">
            <Skeleton variant="rounded" width={44} height={44} />
            <Stack spacing={1} sx={{ flex: 1 }}>
              <Skeleton variant="text" width={180} />
              <Skeleton variant="text" height={36} width={220} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
      <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Skeleton variant="text" width={120} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={160} />
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Skeleton variant="text" width={200} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={220} />
          </CardContent>
        </Card>
      </div>
      <div className="col-span-12 lg:col-span-4">
        <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
          <CardContent>
            <Skeleton variant="text" width={160} sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" height={56} />
              <Skeleton variant="rounded" height={56} />
              <Skeleton variant="rounded" height={56} />
            </Stack>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
