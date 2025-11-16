import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Tab, AspectRatio } from './types';
import { generateSpeech, decodeAudioData, generateImage, generateVideoFromPrompt, generateVideoFromImage, generateImagePromptsForStory, generateCharacterDescription } from './services/geminiService';

// --- ICONS ---
const StoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const ImageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const VideoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const Spinner = () => <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;

// --- HELPER COMPONENTS ---
interface TabButtonProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-center px-4 py-3 font-semibold rounded-lg transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 ${
      isActive
        ? 'bg-pink-500 text-white shadow-lg'
        : 'bg-white text-slate-600 hover:bg-pink-50'
    }`}
  >
    {icon}
    {label}
  </button>
);

// --- GENERATOR COMPONENTS ---

// FIX: Removed apiKey prop
const SpeechGenerator: React.FC<{ onPromptSubmit: (prompt: string) => void }> = ({ onPromptSubmit }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioB64, setAudioB64] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      return () => { audioContextRef.current?.close(); };
    }, []);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter some text to generate speech.');
            return;
        }
        onPromptSubmit(prompt);
        setIsLoading(true);
        setError(null);
        setAudioB64(null);
        if (audioSourceRef.current) audioSourceRef.current.stop();

        try {
            // FIX: Removed apiKey from call
            const audioResult = await generateSpeech(prompt);
            setAudioB64(audioResult);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const playAudio = async () => {
        if (!audioB64 || !audioContextRef.current) return;
        if (audioSourceRef.current) audioSourceRef.current.stop();

        const audioBytes = Uint8Array.from(atob(audioB64), c => c.charCodeAt(0));
        const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();
        audioSourceRef.current = source;
    };

    const handleDownloadAudio = () => {
        if (!audioB64) return;
        const writeString = (view: DataView, offset: number, string: string) => { for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i)); };
        const binaryString = atob(audioB64);
        const len = binaryString.length;
        const pcmData = new Uint8Array(len);
        for (let i = 0; i < len; i++) pcmData[i] = binaryString.charCodeAt(i);
        const sampleRate = 24000, numChannels = 1, bitsPerSample = 16, bytesPerSample = bitsPerSample / 8, dataSize = pcmData.length, blockAlign = numChannels * bytesPerSample, byteRate = sampleRate * blockAlign, buffer = new ArrayBuffer(44 + dataSize), view = new DataView(buffer);
        writeString(view, 0, 'RIFF'); view.setUint32(4, 36 + dataSize, true); writeString(view, 8, 'WAVE'); writeString(view, 12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true); view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true); view.setUint16(34, bitsPerSample, true); writeString(view, 36, 'data'); view.setUint32(40, dataSize, true); new Uint8Array(buffer, 44).set(pcmData);
        const blob = new Blob([view], { type: 'audio/wav' }), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'generated-speech.wav'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-700">Speech Synthesis Generator</h2>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A friendly dragon who loves to bake cookies..." className="w-full h-32 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow" disabled={isLoading} />
            <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="w-full flex items-center justify-center bg-sky-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-600 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">
                {isLoading && <Spinner />} {isLoading ? 'Generating Audio...' : 'Generate Speech'}
            </button>
            {error && <div className="text-red-500 bg-red-100 p-3 rounded-lg">{error}</div>}
            {isLoading && <div className="text-center p-4 bg-sky-100 rounded-lg"><p className="text-sky-700 font-semibold animate-pulse">Generating audio...</p></div>}
            {!isLoading && audioB64 && (
                <div className="bg-green-100 p-4 rounded-lg space-y-6">
                    <div className="text-center">
                        <h3 className="text-lg font-semibold text-green-800 mb-3">Audio Ready!</h3>
                        <div className="flex items-center justify-center space-x-4">
                            <button onClick={playAudio} className="inline-flex items-center bg-green-500 text-white font-bold py-2 px-6 rounded-full hover:bg-green-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>Play</button>
                            <button onClick={handleDownloadAudio} className="inline-flex items-center bg-sky-500 text-white font-bold py-2 px-6 rounded-full hover:bg-sky-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>Download Audio</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// FIX: Removed apiKey prop
const IllustrationGenerator: React.FC<{ storyPrompt: string }> = ({ storyPrompt }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [imageUrls, setImageUrls] = useState<string[]>([]);

    useEffect(() => { if (storyPrompt) setPrompt(storyPrompt); }, [storyPrompt]);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a story idea.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setImageUrls([]);

        try {
            setLoadingMessage('Creating your main character...');
            // FIX: Removed apiKey from call
            const characterDescription = await generateCharacterDescription(prompt);
            setLoadingMessage('Outlining 12 story scenes...');
            // FIX: Removed apiKey from call
            const imagePrompts = await generateImagePromptsForStory(prompt);

            if (imagePrompts.length > 0) {
                 for (let i = 0; i < imagePrompts.length; i++) {
                    setLoadingMessage(`Generating illustration ${i + 1} of ${imagePrompts.length}...`);
                    // FIX: Removed apiKey from call
                    const imageUrl = await generateImage(imagePrompts[i], characterDescription);
                    setImageUrls(prevUrls => [...prevUrls, imageUrl]);
                    if (i < imagePrompts.length - 1) {
                        setLoadingMessage(`Pausing for 15 seconds to avoid rate limits...`);
                        await new Promise(resolve => setTimeout(resolve, 15000));
                    }
                }
            } else {
                setError("Could not generate any story scenes. Please try a different prompt.");
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            console.error(e);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-700">Story Illustrations Generator</h2>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A happy little robot waving... or use the prompt from the Speech tab." className="w-full h-24 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow" disabled={isLoading}/>
            <button onClick={handleGenerate} disabled={isLoading || !prompt.trim()} className="w-full flex items-center justify-center bg-sky-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-600 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">
                {isLoading && <Spinner />} {isLoading ? 'Generating...' : 'Generate Illustrations'}
            </button>
            {error && <div className="text-red-500 bg-red-100 p-3 rounded-lg">{error}</div>}
            {isLoading && <div className="text-center p-4 bg-sky-100 rounded-lg"><p className="text-sky-700 font-semibold animate-pulse">{loadingMessage}</p></div>}
            {imageUrls.length > 0 && (
                <div className="bg-green-100 p-4 rounded-lg text-center">
                    <h3 className="text-lg font-semibold text-green-800 mb-3">Your Story Illustrations</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {imageUrls.map((url, index) => (
                            <div key={index} className="p-2 bg-white rounded-lg shadow space-y-2">
                                <img src={url} alt={`Story illustration ${index + 1}`} className="w-full h-auto object-cover rounded aspect-square" />
                                <a href={url} download={`story-image-${index + 1}.jpg`} className="block text-center w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors text-sm">Download Image</a>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// FIX: Removed apiKey prop
const VideoGenerator: React.FC<{}> = () => {
    const [mode, setMode] = useState<'prompt' | 'image'>('prompt');
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
    const [uploadedImage, setUploadedImage] = useState<{file: File, base64: string, preview: string} | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // FIX: Add state for API key selection
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [checkingApiKey, setCheckingApiKey] = useState(true);

    // FIX: Check for selected API key on mount for Veo models
    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio) {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setApiKeySelected(hasKey);
            }
            setCheckingApiKey(false);
        };
        checkKey();
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            // Assume success to avoid race conditions
            setApiKeySelected(true);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = (event.target?.result as string).split(',')[1];
                setUploadedImage({ file, base64, preview: URL.createObjectURL(file) });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (mode === 'image' && !uploadedImage) {
            setError('Please upload an image to animate.');
            return;
        }
        if (mode === 'prompt' && !prompt.trim()) {
            setError('Please enter a prompt for the video.');
            return;
        }
        setIsLoading(true); setLoadingMessage('Initializing video generation...'); setError(null); setVideoUrl(null);

        try {
            let resultUrl: string;
            if (mode === 'prompt') {
                // FIX: Removed apiKey from call
                resultUrl = await generateVideoFromPrompt(prompt, aspectRatio, setLoadingMessage);
            } else if (uploadedImage) {
                // FIX: Removed apiKey from call
                resultUrl = await generateVideoFromImage(prompt, uploadedImage.base64, uploadedImage.file.type, aspectRatio, setLoadingMessage);
            } else {
                throw new Error("Invalid state for video generation.");
            }
            setVideoUrl(resultUrl);
        } catch (e) {
            // FIX: Add error handling for invalid API keys
            if (e instanceof Error && e.message.includes('Requested entity was not found.')) {
                setApiKeySelected(false);
                setError('Your API key is invalid. Please select a valid key to continue.');
            } else {
                setError(e instanceof Error ? e.message : 'An unknown error occurred.');
            }
            console.error(e);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const isGenerateDisabled = isLoading || (mode === 'image' && !uploadedImage) || (mode === 'prompt' && !prompt.trim());

    // FIX: Add UI to prompt for API key selection if not already done
    if (checkingApiKey) {
        return (
            <div className="flex justify-center items-center p-8">
                <Spinner />
                <span className="ml-2 text-slate-600">Checking API key status...</span>
            </div>
        )
    }

    if (!apiKeySelected) {
        return (
            <div className="text-center p-6 bg-amber-100 rounded-lg shadow-inner">
                <h3 className="font-bold text-amber-800 text-lg">API Key Required for Video Animation</h3>
                <p className="text-amber-700 mt-2">
                    Video animation with Veo requires a Google AI Studio API key. Please select a key to proceed.
                </p>
                <p className="text-sm text-amber-600 mt-2">
                    For information on billing, please see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline">Google AI Platform billing documentation</a>.
                </p>
                <button onClick={handleSelectKey} className="mt-4 bg-sky-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-sky-600 transition-colors">
                    Select API Key
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-700">Video Animator</h2>
            <div className="flex bg-slate-200 p-1 rounded-lg">
                <button onClick={() => setMode('prompt')} className={`w-1/2 py-2 px-4 rounded-md font-semibold transition-colors ${mode === 'prompt' ? 'bg-white shadow' : 'text-slate-600'}`}>From Prompt</button>
                <button onClick={() => setMode('image')} className={`w-1/2 py-2 px-4 rounded-md font-semibold transition-colors ${mode === 'image' ? 'bg-white shadow' : 'text-slate-600'}`}>From Image</button>
            </div>
            
            {mode === 'prompt' ? (
                 <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g., A rocket ship made of carrots..." className="w-full h-24 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow" disabled={isLoading}/>
            ) : (
                <div className="space-y-4">
                    <div className="w-full h-48 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-slate-500 cursor-pointer hover:border-sky-500 hover:bg-sky-50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                        {uploadedImage ? <img src={uploadedImage.preview} alt="Upload preview" className="max-h-full max-w-full object-contain rounded-md" /> : "Click to upload an image"}
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={isLoading}/>
                     <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Optional: Describe how to animate the image..." className="w-full h-20 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow" disabled={isLoading}/>
                </div>
            )}
            <div>
                <label className="font-semibold text-slate-600 mb-2 block">Aspect Ratio</label>
                <div className="flex space-x-2">
                    {(['16:9', '9:16'] as AspectRatio[]).map(ratio => (<button key={ratio} onClick={() => setAspectRatio(ratio)} className={`px-4 py-2 rounded-lg font-semibold transition-all ${aspectRatio === ratio ? 'bg-pink-500 text-white shadow' : 'bg-white text-slate-600 hover:bg-pink-50'} disabled:bg-slate-200 disabled:text-slate-400`}>{ratio} {ratio === '16:9' ? '(Landscape)' : '(Portrait)'}</button>))}
                </div>
            </div>
            <button onClick={handleGenerate} disabled={isGenerateDisabled} className="w-full flex items-center justify-center bg-sky-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-600 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">
                {isLoading && <Spinner />} {isLoading ? 'Animating Video...' : 'Generate Video'}
            </button>
            {error && <div className="text-red-500 bg-red-100 p-3 rounded-lg">{error}</div>}
            {isLoading && (<div className="text-center p-4 bg-sky-100 rounded-lg"><p className="text-sky-700 font-semibold animate-pulse">{loadingMessage}</p><p className="text-sm text-slate-500 mt-1">Video generation can take a few minutes.</p></div>)}
            {videoUrl && (<div className="p-4 bg-white rounded-lg shadow-md space-y-4"><video src={videoUrl} controls className="w-full rounded-lg" /><a href={videoUrl} download="generated-video.mp4" className="block text-center w-full bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600 transition-colors">Download Video</a></div>)}
        </div>
    );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.Story);
  const [storyPrompt, setStoryPrompt] = useState('');

  // FIX: Removed all manual API key management state and effects.
  
  const renderContent = () => {
    // FIX: Removed API key check and settings tab logic
    switch (activeTab) {
      case Tab.Story: return <SpeechGenerator onPromptSubmit={setStoryPrompt} />;
      case Tab.Image: return <IllustrationGenerator storyPrompt={storyPrompt} />;
      case Tab.Video: return <VideoGenerator />;
      default: return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-pink-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">
            Kids Content Creator <span className="text-pink-500">Studio</span>
          </h1>
          <p className="mt-2 text-lg text-slate-600">Bring your stories to life with AI magic!</p>
        </header>

        {/* FIX: Removed Settings tab and adjusted grid layout */}
        <nav className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
          <TabButton label="Speech" icon={<StoryIcon />} isActive={activeTab === Tab.Story} onClick={() => setActiveTab(Tab.Story)} />
          <TabButton label="Illustrations" icon={<ImageIcon />} isActive={activeTab === Tab.Image} onClick={() => setActiveTab(Tab.Image)} />
          <TabButton label="Animation" icon={<VideoIcon />} isActive={activeTab === Tab.Video} onClick={() => setActiveTab(Tab.Video)} />
        </nav>

        <main className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg">
          {renderContent()}
        </main>
        <footer className="text-center mt-8 text-slate-500 text-sm"><p>Powered by Google Gemini</p></footer>
      </div>
    </div>
  );
}
