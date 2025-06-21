"use client";

import { useState, useEffect } from 'react';
import { Phone, X, Mic, MicOff, Volume2, Plus, Video, User } from 'lucide-react';

const KeypadButton = ({ value, subtext, onClick }: { value: string, subtext: string, onClick: (key: string) => void }) => (
  <button onClick={() => onClick(value)} className="flex flex-col items-center justify-center h-20 w-20 rounded-full bg-gray-200 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-transform transform hover:scale-105">
    <span className="text-3xl font-light">{value}</span>
    {subtext && <span className="text-xs tracking-widest">{subtext}</span>}
  </button>
);

export default function Home() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCalling) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
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
        <div className="flex-grow flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <User size={48} />
          </div>
          <p className="text-3xl font-semibold">{phoneNumber}</p>
          <p className="text-lg text-gray-400">Calling...</p>
          <p className="text-lg text-gray-400 mt-2">{formatDuration(callDuration)}</p>
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
