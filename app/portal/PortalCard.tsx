import type { ReactNode } from 'react';
import { AppSurface } from '@/components/admin/AppSurface';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/** The centred card the login, forgot and reset pages share. */
export function PortalCard({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  return (
    <AppSurface>
      <main className="grid min-h-dvh place-items-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <p className="font-heading text-[26px] tracking-wide">Rêve</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {subtitle}
            </p>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </main>
    </AppSurface>
  );
}
