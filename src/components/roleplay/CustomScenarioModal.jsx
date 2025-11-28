import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../context/UserContext';
import { ClientPersona, AgentVoice } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Play, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import LoadingIndicator from '../ui/LoadingIndicator';
import { base44 } from '@/api/base44Client';

export default function CustomScenarioModal({ isOpen, onClose, baseScenario, onSubmit }) {
  const { user } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [personas, setPersonas] = useState([]);
  const [voices, setVoices] = useState([]);
  const [playingVoice, setPlayingVoice] = useState(null);
  const [audioElement, setAudioElement] = useState(null);

  const [formData, setFormData] = useState({
    initialContext: '',
    clientPersona: '',
    difficultyLevel: 'intermediate',
    firstMessageOverride: '',
    voiceId: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [personasData, voicesData] = await Promise.all([
        base44.entities.ClientPersona.filter({ isActive: true }),
        base44.entities.AgentVoice.filter({ isActive: true })
      ]);

      setPersonas(personasData || []);
      setVoices(voicesData || []);

      if (personasData && personasData.length > 0) {
        setFormData(prev => ({ ...prev, clientPersona: personasData[0].personaKey }));
      }
      if (voicesData && voicesData.length > 0) {
        setFormData(prev => ({ ...prev, voiceId: voicesData[0].voice_id }));
      }
    } catch (error) {
      console.error('Error loading custom scenario data:', error);
      toast.error('Failed to load scenario options');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayVoice = (previewUrl) => {
    if (audioElement) {
      audioElement.pause();
    }

    if (playingVoice === previewUrl) {
      setPlayingVoice(null);
      return;
    }

    const audio = new Audio(previewUrl);
    audio.onended = () => setPlayingVoice(null);
    audio.play();
    setAudioElement(audio);
    setPlayingVoice(previewUrl);
  };

  const handleSubmit = async () => {
    if (!formData.initialContext.trim()) {
      toast.error('Please provide an initial context for the scenario');
      return;
    }

    if (!formData.clientPersona) {
      toast.error('Please select a client persona');
      return;
    }

    if (!formData.voiceId) {
      toast.error('Please select a voice');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        baseScenarioId: baseScenario.id,
        ...formData
      });
      onClose();
    } catch (error) {
      console.error('Error submitting custom scenario:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full bg-white border border-gray-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Create Custom Scenario</h2>
            <p className="text-sm text-gray-500 mt-1">Design your own role-play scenario</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <CardContent className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingIndicator size="md" text="Loading options..." />
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <Label htmlFor="initialContext">Initial Context</Label>
                <Textarea
                  id="initialContext"
                  placeholder="Describe the scenario setup. Example: You are a first-time homebuyer who is concerned about the market timing..."
                  value={formData.initialContext}
                  onChange={(e) => setFormData({ ...formData, initialContext: e.target.value })}
                  className="mt-1 h-32"
                />
                <p className="text-xs text-gray-500 mt-1">This sets up the context for the AI client</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientPersona">Client Persona</Label>
                  <Select
                    value={formData.clientPersona}
                    onValueChange={(value) => setFormData({ ...formData, clientPersona: value })}
                  >
                    <SelectTrigger id="clientPersona" className="mt-1">
                      <SelectValue placeholder="Select a persona" />
                    </SelectTrigger>
                    <SelectContent>
                      {personas.map((persona) => (
                        <SelectItem key={persona.id} value={persona.personaKey}>
                          {persona.personaName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="difficultyLevel">Difficulty Level</Label>
                  <Select
                    value={formData.difficultyLevel}
                    onValueChange={(value) => setFormData({ ...formData, difficultyLevel: value })}
                  >
                    <SelectTrigger id="difficultyLevel" className="mt-1">
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="expert">Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="firstMessage">First Message Override (Optional)</Label>
                <Input
                  id="firstMessage"
                  placeholder="Hello, I'm calling about purchasing a home..."
                  value={formData.firstMessageOverride}
                  onChange={(e) => setFormData({ ...formData, firstMessageOverride: e.target.value })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Custom opening line from the AI client</p>
              </div>

              <div>
                <Label>Voice Selection</Label>
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {voices.map((voice) => (
                    <div
                      key={voice.id}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.voiceId === voice.voice_id
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                      onClick={() => setFormData({ ...formData, voiceId: voice.voice_id })}
                    >
                      <span className="font-medium text-gray-900 text-sm">{voice.name}</span>
                      {voice.previewAudioUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayVoice(voice.previewAudioUrl);
                          }}
                          className={`p-2 rounded-full transition-colors ${
                            playingVoice === voice.previewAudioUrl
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || submitting}
            className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <LoadingIndicator size="sm" />
                Initiating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Begin Call
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}