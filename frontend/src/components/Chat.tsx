import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';


export function Chat() {
    const [input, setInput] = useState(''); // setting the input state
    const [isSending, setIsSending] = useState(false); // setting the isSending state (so that send button can be disabled)
    const lastMessageRef = useRef<HTMLDivElement | null>(null); // reference to the last message in the chat to scroll to


    const [messages, setMessages] = useState<
        { role: 'user' | 'assistant'; content: string }[]
    >([]); // setting the messages state


    useEffect(() => {
        if (lastMessageRef.current) { // if there is a last message, scroll to it
            lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        setIsSending(true);
        e.preventDefault();
        if (!input.trim()) return;

        const newUserMessage = { role: 'user' as const, content: input };
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setInput('');

        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: updatedMessages }),
        });


        if (!res.ok || !res.body) {
            console.error('❌ Failed to stream from /api/chat');
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';
        // let firstToken = true;

        setMessages([...updatedMessages, { role: 'assistant', content: '' }]);

        while (true) { // process the stream
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            for (const line of chunk.split('\n')) {
                if (line.startsWith('0:')) {
                    try {
                        const raw = line.slice(2);
                        const text = JSON.parse(raw);

                        const cleanText = text // remove citation and other unwanted text
                            .replace(/^Assistant:\s*/i, '')
                            .replace(/\n{2,}/g, '\n')
                            .replace(/\s+\n/g, '\n')
                            .replace(/\n\s+/g, '\n')
                            .replace(/\[\^[^\]]+\]/g, '');

                        assistantMessage += cleanText;

                        setMessages((prev) => {
                            const updated = [...prev];
                            updated[updated.length - 1] = {
                                role: 'assistant',
                                content: assistantMessage,
                            };
                            setIsSending(false);
                            return updated;
                        });
                    } catch (err) {
                        console.warn('⚠️ Failed to parse token:', line, err);
                    }
                }

            }
        }
    };


    return (
        <div className='flex flex-col w-[40%] mb-10 h-[90%]'>
            <div className='flex justify-center h-full'>
                <div className="block shadow-2xl bg-white rounded-2xl w-full h-full">
                    <div className="flex flex-col space-y-1.5 p-6 rounded-md bg-secondary h-fit w-full">
                        <h2 className="font-bold text-3xl text-primary tracking-tight">PEA</h2>
                        <p className="text-sm font-light text-white leading-3">Chat with your personal email assistant!</p>
                    </div>

                    <div className='w-full h-fit -my-1 opacity-100 z-40'>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320"><path fill="#2ec4b6" fill-opacity="1" d="M0,32L40,64C80,96,160,160,240,170.7C320,181,400,139,480,117.3C560,96,640,96,720,112C800,128,880,160,960,181.3C1040,203,1120,213,1200,181.3C1280,149,1360,75,1400,37.3L1440,0L1440,0L1400,0C1360,0,1280,0,1200,0C1120,0,1040,0,960,0C880,0,800,0,720,0C640,0,560,0,480,0C400,0,320,0,240,0C160,0,80,0,40,0L0,0Z"></path></svg>
                    </div>

                    <main className="flex-1 overflow-y-auto h-[68%] p-4 bg-white -mt-5 space-y-4 scroll-hidden">
                        {messages.map((m, i) => (
                            <div
                                key={i}
                                ref={i === messages.length - 1 ? lastMessageRef : null}
                                className={`max-w-[80%] px-4 py-2 rounded-lg break-words shadow-sm whitespace-pre-wrap ${m.role === 'user'
                                    ? 'bg-primary w-max ml-auto text-right'
                                    : 'bg-white mr-auto text-left'
                                    }`}
                            >
                                <p className="text-sm text-gray-700 prose prose-sm">
                                    <ReactMarkdown>
                                        {m.content}
                                    </ReactMarkdown>
                                </p>
                            </div>
                        ))}
                    </main>

                    <div className="rounded-b-2xl h-fit">
                        <form onSubmit={handleSubmit} className="flex h-fit sticky items-center rounded-b-2xl gap-2 pb-4 px-4 pt-2 bg-white border-t bottom-0">
                            <input
                                className="flex h-10 w-full rounded-md border border-secondary px-3 py-2 text-sm placeholder-[#6b7280] focus:outline-none focus:ring-1 focus:ring-secondary disabled:cursor-not-allowed disabled:opacity-50 text-[#030712] "
                                placeholder="Ask about your emails..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={isSending}
                                className={`flex justify-center w-[25%] h-fit px-4 py-2 outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 active:ring-0 rounded-md text-white transition-transform duration-100
                                    ${isSending ? 'bg-accent py-3 border-0 ' : 'bg-secondary hover:bg-accent border-0 active:scale-95'}
                                  `}
                            >
                                {isSending ? (
                                    <svg
                                        className="animate-spin h-4 w-4 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
                                        />
                                    </svg>
                                ) : (
                                    'Send'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>



        </div>
    );
}
