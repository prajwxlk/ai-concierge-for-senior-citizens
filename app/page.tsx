"use client";

import { useState, useEffect, useRef } from 'react';
import { Phone, X, Mic, MicOff, Volume2, Plus, Video, User } from 'lucide-react';
import { getVAD } from './vad-helper';
import { Toaster } from 'react-hot-toast';

const KeypadButton = ({ value, subtext, onClick }: { value: string, subtext: string, onClick: (key: string) => void }) => (
  <button onClick={() => onClick(value)} className="flex flex-col items-center justify-center h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-transform transform hover:scale-105">
    <span className="text-3xl font-light">{value}</span>
    {subtext && <span className="text-xs tracking-widest">{subtext}</span>}
  </button>
);

export default function Home() {
  // ...existing state
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null); // <-- Track current TTS/AI audio

  const [languageCode, setLanguageCode] = useState<string | null>(null); // <-- store call language
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [recording, setRecording] = useState(false);
  const [vadStatus, setVadStatus] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [audioSnippets, setAudioSnippets] = useState<Blob[]>([]);
  const [memory, setMemory] = useState<string[]>([]);
  // Use a ref to track the latest memory state for API calls
  const memoryRef = useRef<string[]>([]);
  // Always initialize with a no-op to avoid undefined
  const vadCleanupRef = useRef<() => void>(() => { });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Reset memory on component mount
  useEffect(() => {
    console.log('[MEMORY] Initializing - clearing any existing memory');
    setMemory([]);
    memoryRef.current = [];
  }, []);

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isCalling) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval !== null) clearInterval(interval);
    };
  }, [isCalling]);

  // VAD + recording logic
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cleanup: (() => void) | undefined;
    let stopped = false;
    // Define audioContext in effect scope for cleanup
    let audioContext: AudioContext | null = null;
    async function startVad() {
      if (!isCalling) return;
      
      // Verify memory is empty when starting a new call
      if (memory.length > 0 || memoryRef.current.length > 0) {
        console.warn('[MEMORY] Memory not empty when starting new call - forcing reset');
        setMemory([]);
        memoryRef.current = [];
      }
      
      setVadStatus('idle');
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[VAD DEBUG] Got microphone stream:', stream);
        const vad = await getVAD();
        console.log('[VAD DEBUG] Loaded VAD:', vad);
        if (!vad) return;
        // Create AudioContext for VAD (Safari/Chrome)
        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext);
        audioContext = new AudioCtx();
        console.log('[VAD DEBUG] Created AudioContext:', audioContext);
        cleanup = vad(audioContext, stream!, {
          onVoiceStart: () => {
            if (stopped) return;
            console.log('[VAD DEBUG] Voice detected: onVoiceStart');
            setVadStatus(prev => {
              console.log('[VAD DEBUG] vadStatus change:', prev, '-> recording');
              return 'recording';
            });
            chunksRef.current = [];
            const rec = new MediaRecorder(stream!);
            mediaRecorderRef.current = rec;
            rec.ondataavailable = e => {
              if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            rec.onstop = async () => {
              if (chunksRef.current.length > 0) {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioSnippets(snips => [...snips, audioBlob]);

                // Send audioBlob to /api/agent as multipart/form-data
                try {
                  const formData = new FormData();
                  formData.append('file', audioBlob, 'recording.webm');
                  // If we have a languageCode, include it for subsequent requests
                  if (languageCode) {
                    formData.append('language_code', languageCode);
                  }
                  // Always send the memory from the ref (which has the latest value)
                  formData.append('memory', JSON.stringify(memoryRef.current));
                  const response = await fetch('/api/agent', {
                    method: 'POST',
                    body: formData,
                  });
                  if (response.ok) {
                    const data = await response.json();
                    // If languageCode is not set, set it from response
                    if (!languageCode && data.language_code) {
                      setLanguageCode(data.language_code);
                    }
                    // Update memory state with the memory returned from the API
                    if (data.memory && Array.isArray(data.memory)) {
                      console.log('[MEMORY] Updating memory with:', data.memory);
                      setMemory(data.memory);
                      // Update the ref immediately to ensure it's available for the next API call
                      memoryRef.current = data.memory;
                    }
                    console.log('[STT] Transcription result:', data);
                    // Play audio if present from /agent response
                    if (data && data.audioContent) {
                      // Helper: base64 to Blob
                      const base64ToBlob = (b64Data: string, contentType = 'audio/mp3', sliceSize = 512) => {
                        const byteCharacters = atob(b64Data);
                        const byteArrays = [];
                        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                          const slice = byteCharacters.slice(offset, offset + sliceSize);
                          const byteNumbers = new Array(slice.length);
                          for (let i = 0; i < slice.length; i++) {
                            byteNumbers[i] = slice.charCodeAt(i);
                          }
                          const byteArray = new Uint8Array(byteNumbers);
                          byteArrays.push(byteArray);
                        }
                        return new Blob(byteArrays, { type: contentType });
                      };
                      // Try to detect audio format (default to mp3)
                      let audioType = 'audio/mp3';
                      if (data.audioContent.startsWith('SUQz')) audioType = 'audio/wav'; // 'RIFF' in base64
                      else if (data.audioContent.startsWith('UklG')) audioType = 'audio/wav';
                      else if (data.audioContent.startsWith('AAAA')) audioType = 'audio/aac';
                      const audioBlob = base64ToBlob(data.audioContent, audioType);
                      const audioUrl = URL.createObjectURL(audioBlob);
                      // Stop previous audio if playing
                      if (ttsAudioRef.current) {
                        ttsAudioRef.current.pause();
                        ttsAudioRef.current.currentTime = 0;
                      }
                      const audio = new Audio(audioUrl);
                      ttsAudioRef.current = audio;
                      audio.play().catch(e => console.error('Audio play failed:', e));
                    }
                  } else {
                    const errorText = await response.text();
                    console.error('[STT] Error from /api/stt:', errorText);
                  }
                } catch (err) {
                  console.error('[STT] Network or server error:', err);
                }
              }
              console.log('[VAD DEBUG] Recording stopped, processing...');
              setVadStatus(prev => {
                console.log('[VAD DEBUG] vadStatus change:', prev, '-> processing');
                return 'processing';
              });
              setTimeout(() => {
                setVadStatus(prev => {
                  console.log('[VAD DEBUG] vadStatus change:', prev, '-> idle');
                  return 'idle';
                });
              }, 300); // brief feedback
            };
            rec.start();
          },
          onVoiceStop: () => {
            console.log('[VAD DEBUG] Silence detected: onVoiceStop');
            setVadStatus(prev => {
              console.log('[VAD DEBUG] vadStatus change:', prev, '-> processing');
              return 'processing';
            });
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
          },
          interval: 100,
          threshold: 0.4,
          debounceTime: 250,
        });
        vadCleanupRef.current = cleanup ?? (() => { });
      } catch (err) {
        // Handle mic errors
        setVadStatus('idle');
      }
    }
    if (isCalling) {
      startVad();
    }
    return () => {
      stopped = true;
      (typeof vadCleanupRef.current === 'function' ? vadCleanupRef.current : () => { })();
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      // Clean up AudioContext if created
      if (audioContext && typeof audioContext.close === 'function') {
        audioContext.close().then(() => {
          console.log('[VAD DEBUG] AudioContext closed');
        }).catch((err: unknown) => {
          console.log('[VAD DEBUG] AudioContext close error:', err);
        });
      }
      setVadStatus('idle');
    };
  }, [isCalling]);

  const handleKeyPress = (key: string) => {
    if (phoneNumber.length < 15) {
      setPhoneNumber(phoneNumber + key);
    }
  };

  const handleDelete = () => {
    setPhoneNumber(phoneNumber.slice(0, -1));
  };

  const handleCall = () => {
    if (phoneNumber) {
      setIsCalling(true);
    }
  };

  const handleEndCall = () => {
    // Stop any playing TTS/AI audio
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.currentTime = 0;
    }
    // Reset memory first when call ends to ensure it's cleared immediately
    console.log('[MEMORY] Clearing conversation memory on call end');
    setMemory([]);
    memoryRef.current = [];
    
    // Then update other state
    setIsCalling(false);
    setPhoneNumber('');
    setCallDuration(0);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const keypadKeys = [
    { value: '1', subtext: '' },
    { value: '2', subtext: 'ABC' },
    { value: '3', subtext: 'DEF' },
    { value: '4', subtext: 'GHI' },
    { value: '5', subtext: 'JKL' },
    { value: '6', subtext: 'MNO' },
    { value: '7', subtext: 'PQRS' },
    { value: '8', subtext: 'TUV' },
    { value: '9', subtext: 'WXYZ' },
    { value: '*', subtext: '' },
    { value: '0', subtext: '+' },
    { value: '#', subtext: '' },
  ];

  if (isCalling) {
    return (
      <div className="flex flex-col h-screen bg-gray-900 text-white p-6">
        <Toaster position="top-center" reverseOrder={false} />
        <div className="flex-grow flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <User size={48} />
          </div>
          <p className="text-3xl font-semibold">{phoneNumber}</p>
          <p className="text-lg text-gray-400">Calling...</p>
          <p className="text-lg text-gray-400 mt-2">{formatDuration(callDuration)}</p>
          <div className="mt-8">
            <p className="text-base">
              {vadStatus === 'recording' && <span className="text-green-400">● Recording...</span>}
              {vadStatus === 'processing' && <span className="text-yellow-400">Processing...</span>}
              {vadStatus === 'idle' && <span className="text-gray-400">Listening for speech...</span>}
            </p>
            <p className="text-xs text-gray-500 mt-2">Snippets recorded: {audioSnippets.length}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <button onClick={() => setIsMuted(!isMuted)} className={`flex flex-col items-center p-4 rounded-lg transition-colors ${isMuted ? 'bg-yellow-500' : 'bg-gray-800'}`}>
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            <span className="mt-1 text-sm">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button className="flex flex-col items-center p-4 rounded-lg bg-gray-800">
            <Video size={24} />
            <span className="mt-1 text-sm">Video</span>
          </button>
          <button onClick={() => setIsSpeaker(!isSpeaker)} className={`flex flex-col items-center p-4 rounded-lg transition-colors ${isSpeaker ? 'bg-blue-500' : 'bg-gray-800'}`}>
            <Volume2 size={24} />
            <span className="mt-1 text-sm">Speaker</span>
          </button>
          <button className="flex flex-col items-center p-4 rounded-lg bg-gray-800">
            <Plus size={24} />
            <span className="mt-1 text-sm">Add call</span>
          </button>
          <button className="flex flex-col items-center p-4 rounded-lg bg-gray-800">
            <i className="ri-grid-fill"></i>
            <span className="mt-1 text-sm">Keypad</span>
          </button>
          <button className="flex flex-col items-center p-4 rounded-lg bg-gray-800">
            <User size={24} />
            <span className="mt-1 text-sm">Contacts</span>
          </button>
        </div>
        <div className="flex justify-center">
          <button onClick={handleEndCall} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center">
            <Phone size={32} className="transform rotate-[135deg]" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="h-20 flex items-center text-4xl font-light tracking-wider">
          {phoneNumber || <span className="text-gray-400">Enter number</span>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 p-4 max-w-sm mx-auto">
        {keypadKeys.map(k => <KeypadButton key={k.value} value={k.value} subtext={k.subtext} onClick={handleKeyPress} />)}
      </div>
      <div className="flex items-center justify-between p-4 pb-8 max-w-sm mx-auto w-full">
        <div className="w-12 h-12" />
        <button onClick={handleCall} className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400">
          <Phone size={32} className="text-white" />
        </button>
        <button onClick={handleDelete} className={`w-12 h-12 flex items-center justify-center ${phoneNumber ? '' : 'invisible'}`}>
          <X size={28} className="text-gray-500" />
        </button>
      </div>
    </div>
  );
}
