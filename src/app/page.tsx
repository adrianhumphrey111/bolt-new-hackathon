"use client";

import dynamic from 'next/dynamic';

// Dynamically import the Editor component with SSR disabled
const Editor = dynamic(() => import('@/features/editor'), { 
  ssr: false 
});

export default function Home() {
  return <Editor />;
}