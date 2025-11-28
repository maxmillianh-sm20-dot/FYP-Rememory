import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppRoute } from '../types';

export const PersonaSetup = () => {
  const { createPersona, updatePersona, state, navigate } = useApp();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!state.persona && state.hasOnboarded;

  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    traits: '',
    memories: '',
    voiceStyle: '',
    userNickname: '',
    commonPhrases: '',
  });

  useEffect(() => {
    if (isEditing && state.persona) {
      setFormData({
        name: state.persona.name,
        relationship: state.persona.relationship,
        traits: state.persona.traits || '',
        memories: state.persona.memories || '',
        voiceStyle: state.persona.voiceStyle || state.persona.speakingStyle || '',
        userNickname: state.persona.userNickname || '',
        commonPhrases: Array.isArray(state.persona.commonPhrases) ? state.persona.commonPhrases.join(', ') : '',
      });
    }
  }, [isEditing, state.persona]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit called', { step, isEditing, submitting });
    if (submitting) return;
    try {
      setSubmitting(true);

      // If not on final step, just move forward without saving
      if (step < 3) {
        setStep((s) => s + 1);
        return;
      }

      // Normalize phrases for update
      if (isEditing) {
        // Do not send name/relationship changes when editing
        await updatePersona({
          id: state.persona?.id,
          traits: formData.traits,
          memories: formData.memories,
          speakingStyle: formData.voiceStyle,
          userNickname: formData.userNickname,
          biography: '',
          commonPhrases: String(formData.commonPhrases || ''),
        } as any);
      } else {
        const payload = {
          name: formData.name,
          relationship: formData.relationship,
          traits: formData.traits,
          memories: formData.memories,
          speakingStyle: formData.voiceStyle,
          userNickname: formData.userNickname,
          biography: '',
          commonPhrases: String(formData.commonPhrases || ''),
        };
        await createPersona(payload as any);
      }
      navigate(AppRoute.DASHBOARD);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Unable to save persona. Please try again.';
      
      // Handle case where local persona is stale/deleted on server
      if (message.includes('Persona not found') || message.includes('persona_not_found')) {
        // If the persona is missing on the server, try to recreate it with the current data
        try {
          const payload = {
            name: formData.name,
            relationship: formData.relationship,
            traits: formData.traits,
            memories: formData.memories,
            speakingStyle: formData.voiceStyle,
            userNickname: formData.userNickname,
            biography: '',
            commonPhrases: String(formData.commonPhrases || ''),
          };
          await createPersona(payload as any);
          navigate(AppRoute.DASHBOARD);
          return;
        } catch (createErr) {
          console.error('Failed to recreate persona:', createErr);
          // If recreation fails, then we really have to reset
          alert('This persona no longer exists on the server and could not be restored. You will be redirected to create a new one.');
          localStorage.removeItem('rememory_persona_cache');
          window.location.reload();
          return;
        }
      }

      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (state.persona) {
      navigate(AppRoute.DASHBOARD);
    } else {
      navigate(AppRoute.LANDING);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 relative z-20">
      <div className="w-full max-w-4xl bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white overflow-hidden flex flex-col md:flex-row min-h-[600px] animate-fade-in">
        <div className="w-full md:w-1/3 bg-stone-900 p-10 md:p-12 text-stone-50 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-indigo-500/30 rounded-full blur-[60px] animate-pulse-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-rose-500/30 rounded-full blur-[60px] animate-pulse-slow"></div>

          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white mb-6 border border-white/20 font-serif">
                {step}
              </div>
              {isEditing && (
                <button onClick={handleCancel} className="text-xs text-stone-400 hover:text-white uppercase tracking-widest">
                  Cancel
                </button>
              )}
            </div>

            <h2 className="font-display text-3xl md:text-4xl mb-4 leading-tight">
              {isEditing ? 'Refining Memory' : step === 1 ? 'The Beginning' : step === 2 ? 'The Essence' : 'The Bond'}
            </h2>
            <p className="text-stone-400 leading-relaxed font-light">
              {step === 1 && 'Creating a digital persona starts with the basics. This name will be your anchor.'}
              {step === 2 && 'How they spoke and what they loved defines their presence. Be as descriptive as you can.'}
              {step === 3 && 'Shared memories are the bridge between you. Provide context for a meaningful conversation.'}
            </p>
          </div>

          <div className="relative z-10">
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i <= step ? 'w-8 bg-white' : 'w-2 bg-white/20'}`}></div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full md:w-2/3 p-8 md:p-16 flex flex-col bg-gradient-to-br from-white to-stone-50">
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center">
            {step === 1 && (
              <div className="animate-fade-in space-y-8">
                <InputGroup label="Their Name" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Grandma Rose" autoFocus />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputGroup label="Relationship to you" name="relationship" value={formData.relationship} onChange={handleChange} placeholder="e.g. Grandmother" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in space-y-8">
                <InputGroup
                  label="Nickname they call you"
                  name="userNickname"
                  value={formData.userNickname}
                  onChange={handleChange}
                  placeholder="e.g. Ah Boy, Sis, Buddy"
                />
                <TextAreaGroup
                  label="Personality & Traits"
                  name="traits"
                  value={formData.traits}
                  onChange={handleChange}
                  rows={4}
                  placeholder="e.g. Kind, witty, loved gardening, always gave warm hugs..."
                  autoFocus
                />
                <TextAreaGroup
                  label="Speaking Style"
                  name="voiceStyle"
                  value={formData.voiceStyle}
                  onChange={handleChange}
                  rows={3}
                  placeholder="e.g. Soft-spoken, used old-fashioned words, often called me 'dear'..."
                />
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in space-y-8">
                <TextAreaGroup
                  label="Shared Memories & Context"
                  name="memories"
                  value={formData.memories}
                  onChange={handleChange}
                  rows={8}
                  placeholder="This is the most important part. Describe key memories, inside jokes, or important life events you shared..."
                  autoFocus
                />
                <TextAreaGroup
                  label="Common phrases they used"
                  name="commonPhrases"
                  value={formData.commonPhrases}
                  onChange={handleChange}
                  rows={3}
                  placeholder="e.g. their catchphrases, slang, little things they always said..."
                />
              </div>
            )}

            <div className="mt-12 flex justify-end gap-4 items-center">
              {step > 1 && <BackButton onClick={() => setStep((s) => s - 1)} />}
              {step < 3 ? (
                <ActionButton 
                  key="continue" 
                  type="button" 
                  onClick={(e: React.MouseEvent) => { 
                    e.preventDefault(); 
                    setStep((s) => s + 1); 
                  }}
                >
                  Continue &rarr;
                </ActionButton>
              ) : (
                <ActionButton 
                  key="save" 
                  type="submit" 
                  variant="primary" 
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Initialize Persona'}
                </ActionButton>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const InputGroup = ({ label, readOnly, ...props }: any) => (
  <div className="group">
    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 ml-1 group-focus-within:text-indigo-500 transition-colors">
      {label}
    </label>
    <input
      required
      readOnly={readOnly}
      className={`w-full py-4 px-0 bg-transparent border-b-2 border-stone-200 focus:border-indigo-500 outline-none transition-all text-xl md:text-2xl text-stone-800 placeholder:text-stone-300 font-serif ${
        readOnly ? 'cursor-not-allowed text-stone-500' : ''
      }`}
      {...props}
    />
  </div>
);

const TextAreaGroup = ({ label, ...props }: any) => (
  <div className="group">
    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 ml-1 group-focus-within:text-indigo-500 transition-colors">
      {label}
    </label>
    <textarea
      required
      className="w-full p-4 bg-white rounded-2xl border border-stone-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all text-lg text-stone-700 placeholder:text-stone-300 leading-relaxed resize-none"
      {...props}
    />
  </div>
);

const ActionButton = ({ children, onClick, type = 'button', variant = 'primary', disabled = false }: any) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`px-8 py-4 rounded-full font-medium text-lg transition-all shadow-lg active:scale-95 ${
      variant === 'primary'
        ? 'bg-stone-900 text-white hover:bg-stone-800 hover:scale-105'
        : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
    } ${disabled ? 'opacity-60 cursor-not-allowed scale-100' : ''}`}
  >
    {children}
  </button>
);

const BackButton = ({ onClick }: any) => (
  <button
    type="button"
    onClick={onClick}
    className="px-6 py-4 text-stone-500 font-medium hover:text-stone-800 transition-colors"
  >
    Back
  </button>
);
