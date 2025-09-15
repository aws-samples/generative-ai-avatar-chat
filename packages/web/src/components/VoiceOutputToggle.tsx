import React, { useState } from 'react';
import { MdVolumeUp, MdVolumeOff } from 'react-icons/md';

interface VoiceOutputToggleProps {
  initialValue?: boolean;
  onToggle: (value: boolean) => void;
}

const VoiceOutputToggle: React.FC<VoiceOutputToggleProps> = ({
  initialValue = false,
  onToggle,
}) => {
  const [voiceOutput, setVoiceOutput] = useState(initialValue);

  const handleToggle = () => {
    const newValue = !voiceOutput;
    setVoiceOutput(newValue);
    onToggle(newValue);
  };

  return (
    <button
      className="rounded bg-gray-200 p-3 text-gray-800 hover:bg-gray-300 transition-colors"
      onClick={handleToggle}
      title={voiceOutput ? '音声出力: ON' : '音声出力: OFF'}>
      {voiceOutput ? (
        <MdVolumeUp className="text-green-600" size={24} />
      ) : (
        <MdVolumeOff className="text-red-600" size={24} />
      )}
    </button>
  );
};


export default VoiceOutputToggle;