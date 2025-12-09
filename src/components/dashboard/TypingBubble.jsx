// src/components/dashboard/TypingBubble.jsx
export default function TypingBubble() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 mb-2 flex justify-start">
      <div className="flex h-10 items-center gap-1 rounded-2xl rounded-bl-none bg-gray-100 px-4 py-3">
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.3s]"></div>
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.15s]"></div>
        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500"></div>
      </div>
    </div>
  );
}
