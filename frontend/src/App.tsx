import { useState } from 'react';
import { Greet } from '../wailsjs/go/main/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function App() {
  const [greeting, setGreeting] = useState<string>('');

  async function handleGreet() {
    setGreeting(await Greet());
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-6">
          <h1 className="text-2xl font-bold">yukki — placeholder</h1>
          <p className="text-sm text-muted-foreground">
            UI-001b coming next. This is the UI-001a skeleton smoke test.
          </p>
          <Button onClick={handleGreet}>Greet</Button>
          {greeting && (
            <p data-testid="greeting" className="text-sm">
              {greeting}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
