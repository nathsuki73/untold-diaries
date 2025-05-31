import React, { Suspense } from 'react';
import ViewClient from '@/app/view/viewClient';

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <ViewClient />
    </Suspense>
  );
}
