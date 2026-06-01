import { Chat } from '@/components/chat/chat';

export default function Home() {
  return (
    <main className="flex h-screen w-full flex-col">
      <header className="border-b px-6 py-3">
        <h1 className="text-sm font-semibold">Poppy · content strategist</h1>
      </header>
      <div className="flex-1 overflow-hidden">
        <Chat />
      </div>
    </main>
  );
}
