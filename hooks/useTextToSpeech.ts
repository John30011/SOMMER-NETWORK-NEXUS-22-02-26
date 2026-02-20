
import { useState, useCallback, useEffect } from 'react';

// API Key provided by user
const ELEVENLABS_API_KEY = 'sk_929f957c4802cb8006aefb98160ba30b5146960a2899746f'; 

// Voice ID Configuration
// 'ErXwobaYiN0qurTGV4qq' = Antoni (Male) 
// '21m00Tcm4TlvDq8ikWAM' = Rachel (Female)
// 'TxGEqnHWrfWFTfGW9XjX' = Josh (Male, American, Deep) -> Switching to this reliable male voice
const VOICE_ID = 'TxGEqnHWrfWFTfGW9XjX'; 

export const useTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
        if (audioInstance) {
            audioInstance.pause();
            audioInstance.currentTime = 0;
        }
    };
  }, [audioInstance]);

  const speak = useCallback(async (text: string) => {
    if (!text || !ELEVENLABS_API_KEY) return;
    
    // Stop current audio if playing
    if (audioInstance) {
        audioInstance.pause();
        audioInstance.currentTime = 0;
    }

    setIsPlaying(true);
    setError(null);

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2", // Best for Spanish context
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      });

      if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error("ElevenLabs API Error:", errData);
          
          // Helper for specific errors
          if (errData.detail?.status === 'voice_not_found') {
             throw new Error(`Voz no encontrada (ID incorrecto: ${VOICE_ID})`);
          }
          if (errData.detail?.status === 'quota_exceeded') {
             throw new Error('Cuota de API excedida');
          }

          throw new Error('Error al generar audio');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const newAudio = new Audio(url);
      
      newAudio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url); // Cleanup
      };
      
      newAudio.onerror = () => {
          setIsPlaying(false);
          setError("Error de reproducción");
      };

      await newAudio.play();
      setAudioInstance(newAudio);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error desconocido");
      setIsPlaying(false);
    }
  }, [audioInstance]);

  const stop = useCallback(() => {
      if (audioInstance) {
          audioInstance.pause();
          audioInstance.currentTime = 0;
      }
      setIsPlaying(false);
  }, [audioInstance]);

  return { speak, stop, isPlaying, error };
};
