import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { AppRoute } from '../types';

export const PersonaSetup = () => {
  const { createPersona, updatePersona, state, navigate } = useApp();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const isEditing = !!state.persona && state.hasOnboarded;

  const [formData, setFormData] = useState({
    // Step 1
    name: '',
    relationship: '',
    relationshipDescription: '',
    traits: '',
    quirks: '',
    // Step 2
    speakingStyle: '',
    commonPhrases: '',
    languages: '',
    userNickname: '',
    // Step 3
    appearance: '',
    appearanceDetail: '',
    // Step 4
    favoriteMemory: '',
    emotionalMemory: '',
    routine: '',
    meaning: '',
    // Step 5
    values: '',
    spirituality: '',
    beliefs: '',
    comfortStyle: '',
    // Step 6
    lifeGoal: '',
    proudOf: '',
    struggles: '',
    // Step 7
    avoidTopics: '',
    sensitiveDates: '',
    comfortMethod: '',
    // Step 8
    avoidMedical: false,
    avoidFinancial: false,
    avoidLegal: false,
    avoidPredictions: false,
    avoidPhysicalPresence: false,
    avoidReturnClaims: false,
    // Step 9
    farewellStyle: '',
    copingHabits: false,
    // Step 10
    emotionalCheckin: false,
    groundingTechniques: false,
    distressResponse: '',
  });

  useEffect(() => {
    if (isEditing && state.persona) {
      // Note: This is a simplified hydration. In a real app, we'd parse the biography back into fields.
      // For now, we just hydrate the core fields we know about.
      setFormData((prev) => ({
        ...prev,
        name: state.persona?.name || '',
        relationship: state.persona?.relationship || '',
        traits: state.persona?.traits || '',
        speakingStyle: state.persona?.speakingStyle || '',
        userNickname: state.persona?.userNickname || '',
        commonPhrases: Array.isArray(state.persona?.commonPhrases) ? state.persona?.commonPhrases.join(', ') : '',
      }));
    }
  }, [isEditing, state.persona]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (step < 10) {
      setStep((s) => s + 1);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    
    if (step < 10) {
      setStep((s) => s + 1);
      return;
    }

    try {
      setSubmitting(true);

      // Construct the rich biography and memories from all the new fields
      const biography = `
        [Relationship Context]
        Relationship Description: ${formData.relationshipDescription}
        Quirks: ${formData.quirks}
        
        [Appearance]
        Physical Appearance: ${formData.appearance}
        Key Detail: ${formData.appearanceDetail}
        
        [Values & Beliefs]
        Values: ${formData.values}
        Spirituality: ${formData.spirituality}
        Beliefs: ${formData.beliefs}
        Comfort Style: ${formData.comfortStyle}
        
        [Life Story]
        Life Goal: ${formData.lifeGoal}
        Proud Of: ${formData.proudOf}
        Struggles: ${formData.struggles}
        
        [Emotional Triggers & Safety]
        Avoid Topics: ${formData.avoidTopics}
        Sensitive Dates: ${formData.sensitiveDates}
        Comfort Method: ${formData.comfortMethod}
        
        [Boundaries]
        Avoid Medical: ${formData.avoidMedical}
        Avoid Financial: ${formData.avoidFinancial}
        Avoid Legal: ${formData.avoidLegal}
        Avoid Predictions: ${formData.avoidPredictions}
        Avoid Physical Presence: ${formData.avoidPhysicalPresence}
        Avoid Return Claims: ${formData.avoidReturnClaims}
        
        [Closure & Crisis]
        Farewell Style: ${formData.farewellStyle}
        Build Coping Habits: ${formData.copingHabits}
        Emotional Checkin: ${formData.emotionalCheckin}
        Grounding Techniques: ${formData.groundingTechniques}
        Distress Response: ${formData.distressResponse}
      `.trim();

      const memories = `
        Favorite Memory: ${formData.favoriteMemory}
        Emotional Memory: ${formData.emotionalMemory}
        Routine: ${formData.routine}
        Meaning: ${formData.meaning}
      `.trim();

      const fullSpeakingStyle = `
        Style: ${formData.speakingStyle}
        Languages: ${formData.languages}
      `.trim();

      const payload = {
        name: formData.name,
        relationship: formData.relationship,
        traits: formData.traits,
        memories: memories,
        speakingStyle: fullSpeakingStyle,
        userNickname: formData.userNickname,
        biography: biography,
        commonPhrases: String(formData.commonPhrases || ''),
      };

      if (isEditing) {
        await updatePersona({
          id: state.persona?.id,
          ...payload
        } as any);
      } else {
        await createPersona(payload as any);
      }
      navigate(AppRoute.DASHBOARD);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Unable to save persona. Please try again.';
      
      if (message.includes('Persona not found') || message.includes('persona_not_found')) {
        try {
          // Recreate logic if needed, similar to before
           const biography = `
            [Relationship Context]
            Relationship Description: ${formData.relationshipDescription}
            Quirks: ${formData.quirks}
            
            [Appearance]
            Physical Appearance: ${formData.appearance}
            Key Detail: ${formData.appearanceDetail}
            
            [Values & Beliefs]
            Values: ${formData.values}
            Spirituality: ${formData.spirituality}
            Beliefs: ${formData.beliefs}
            Comfort Style: ${formData.comfortStyle}
            
            [Life Story]
            Life Goal: ${formData.lifeGoal}
            Proud Of: ${formData.proudOf}
            Struggles: ${formData.struggles}
            
            [Emotional Triggers & Safety]
            Avoid Topics: ${formData.avoidTopics}
            Sensitive Dates: ${formData.sensitiveDates}
            Comfort Method: ${formData.comfortMethod}
            
            [Boundaries]
            Avoid Medical: ${formData.avoidMedical}
            Avoid Financial: ${formData.avoidFinancial}
            Avoid Legal: ${formData.avoidLegal}
            Avoid Predictions: ${formData.avoidPredictions}
            Avoid Physical Presence: ${formData.avoidPhysicalPresence}
            Avoid Return Claims: ${formData.avoidReturnClaims}
            
            [Closure & Crisis]
            Farewell Style: ${formData.farewellStyle}
            Build Coping Habits: ${formData.copingHabits}
            Emotional Checkin: ${formData.emotionalCheckin}
            Grounding Techniques: ${formData.groundingTechniques}
            Distress Response: ${formData.distressResponse}
          `.trim();

          const memories = `
            Favorite Memory: ${formData.favoriteMemory}
            Emotional Memory: ${formData.emotionalMemory}
            Routine: ${formData.routine}
            Meaning: ${formData.meaning}
          `.trim();

          const fullSpeakingStyle = `
            Style: ${formData.speakingStyle}
            Languages: ${formData.languages}
          `.trim();

          const payload = {
            name: formData.name,
            relationship: formData.relationship,
            traits: formData.traits,
            memories: memories,
            speakingStyle: fullSpeakingStyle,
            userNickname: formData.userNickname,
            biography: biography,
            commonPhrases: String(formData.commonPhrases || ''),
          };
          await createPersona(payload as any);
          navigate(AppRoute.DASHBOARD);
          return;
        } catch (createErr) {
          console.error('Failed to recreate persona:', createErr);
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

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-xl font-serif text-stone-800">Relationship & Background</h3>
            <p className="text-sm text-stone-500 mb-4">Help us understand who this person was to you and their basic background.</p>
            <InputGroup label="What name should the AI use? *" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Grandma Rose" autoFocus />
            <InputGroup label="Who is this person to you? *" name="relationship" value={formData.relationship} onChange={handleChange} placeholder="e.g. Grandmother" />
            <TextAreaGroup label="How would you describe your relationship with them?" name="relationshipDescription" value={formData.relationshipDescription} onChange={handleChange} rows={2} />
            <InputGroup label="What are 3 words that best describe their personality? *" name="traits" value={formData.traits} onChange={handleChange} placeholder="e.g. Kind, Witty, Gentle" />
            <TextAreaGroup label="What are some quirks or little things they often did?" name="quirks" value={formData.quirks} onChange={handleChange} rows={2} />
          </div>
        );
      case 2:
        return (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-xl font-serif text-stone-800">Voice, Tone & Communication Style</h3>
            <p className="text-sm text-stone-500 mb-4">Help the AI understand how they communicated.</p>
            <SelectGroup 
              label="How did they usually speak? *" 
              name="speakingStyle" 
              value={formData.speakingStyle} 
              onChange={handleChange}
              options={[
                "Soft and gentle",
                "Direct and straightforward",
                "Humorous and lighthearted",
                "Formal and proper",
                "Casual and relaxed",
                "Warm and affectionate",
                "Encouraging and supportive"
              ]}
            />
            <TextAreaGroup label="Did they have any phrases they said often? *" name="commonPhrases" value={formData.commonPhrases} onChange={handleChange} rows={2} placeholder="Separate phrases with commas" />
            <InputGroup label="What language or mix of languages did they speak?" name="languages" value={formData.languages} onChange={handleChange} />
            <InputGroup label="How should the AI refer to you?" name="userNickname" value={formData.userNickname} onChange={handleChange} placeholder="e.g. Sweetheart, Buddy" />
          </div>
        );
      case 3:
        return (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-xl font-serif text-stone-800">Appearance & Physical Details</h3>
            <p className="text-sm text-stone-500 mb-4">Used only to help memory clarity and context.</p>
            <TextAreaGroup label="How would you describe their physical appearance?" name="appearance" value={formData.appearance} onChange={handleChange} rows={3} />
            <TextAreaGroup label="Is there any small detail you want the AI to remember?" name="appearanceDetail" value={formData.appearanceDetail} onChange={handleChange} rows={2} />
          </div>
        );
      case 4:
        return (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-xl font-serif text-stone-800">Shared Memories</h3>
            <p className="text-sm text-stone-500 mb-4">The AI will use these to create emotional grounding and context.</p>
            <TextAreaGroup label="What is your favourite memory with them? *" name="favoriteMemory" value={formData.favoriteMemory} onChange={handleChange} rows={3} />
            <TextAreaGroup label="What is a memory that still makes you emotional?" name="emotionalMemory" value={formData.emotionalMemory} onChange={handleChange} rows={3} />
            <TextAreaGroup label="What routine or everyday thing did you do together?" name="routine" value={formData.routine} onChange={handleChange} rows={2} />
            <TextAreaGroup label="What did they mean to you? *" name="meaning" value={formData.meaning} onChange={handleChange} rows={2} />
          </div>
        );
      case 5:
        return (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-xl font-serif text-stone-800">Their Values & Beliefs</h3>
            <p className="text-sm text-stone-500 mb-4">This helps the AI respond in ways that align with their worldview.</p>
            <TextAreaGroup label="What values were important to them? *" name="values" value={formData.values} onChange={handleChange} rows={2} />
            <InputGroup label="Were they religious or spiritual?" name="spirituality" value={formData.spirituality} onChange={handleChange} />
            <TextAreaGroup label="What were their beliefs about life and people?" name="beliefs" value={formData.beliefs} onChange={handleChange} rows={2} />
            <TextAreaGroup label="How would they comfort someone who is hurting? *" name="comfortStyle" value={formData.comfortStyle} onChange={handleChange} rows={2} />
          </div>
        );
      case 6:
        return (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-xl font-serif text-stone-800">Their Goals & Life Story</h3>
            <p className="text-sm text-stone-500 mb-4">This helps the AI behave consistently with their life experiences.</p>
            <TextAreaGroup label="What was their dream or life goal?" name="lifeGoal" value={formData.lifeGoal} onChange={handleChange} rows={2} />
            <TextAreaGroup label="What were they proud of?" name="proudOf" value={formData.proudOf} onChange={handleChange} rows={2} />
            <TextAreaGroup label="What struggles did they have?" name="struggles" value={formData.struggles} onChange={handleChange} rows={2} />
          </div>
        );
      case 7:
        return (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-xl font-serif text-stone-800">Emotional Triggers</h3>
            <p className="text-sm text-stone-500 mb-4">Help us avoid topics that might be harmful or triggering for you.</p>
            <TextAreaGroup label="Are there topics the AI should avoid?" name="avoidTopics" value={formData.avoidTopics} onChange={handleChange} rows={2} />
            <InputGroup label="Are there dates that are sensitive for you?" name="sensitiveDates" value={formData.sensitiveDates} onChange={handleChange} />
            <SelectGroup 
              label="Should the AI comfort you gently or directly? *" 
              name="comfortMethod" 
              value={formData.comfortMethod} 
              onChange={handleChange}
              options={["Gentle and soft", "Direct and straightforward", "Balanced approach"]}
            />
          </div>
        );
      case 8:
        return (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-xl font-serif text-stone-800">Boundaries & Safe-Mode</h3>
            <p className="text-sm text-stone-500 mb-4">Required for safety and to maintain healthy boundaries.</p>
            <CheckboxGroup label="Should the AI avoid giving medical advice?" name="avoidMedical" checked={formData.avoidMedical} onChange={handleChange} />
            <CheckboxGroup label="Should the AI avoid giving financial advice?" name="avoidFinancial" checked={formData.avoidFinancial} onChange={handleChange} />
            <CheckboxGroup label="Should the AI avoid giving legal advice?" name="avoidLegal" checked={formData.avoidLegal} onChange={handleChange} />
            <CheckboxGroup label="Should the AI avoid making real-world predictions?" name="avoidPredictions" checked={formData.avoidPredictions} onChange={handleChange} />
            <CheckboxGroup label="Should the AI avoid pretending to be physically present?" name="avoidPhysicalPresence" checked={formData.avoidPhysicalPresence} onChange={handleChange} />
            <CheckboxGroup label="Should the AI avoid claiming it can 'come back' or 'see you'?" name="avoidReturnClaims" checked={formData.avoidReturnClaims} onChange={handleChange} />
          </div>
        );
      case 9:
        return (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-xl font-serif text-stone-800">Guided Closure Preferences</h3>
            <p className="text-sm text-stone-500 mb-4">How should the AI help you during the final days of the 30-day period?</p>
            <SelectGroup 
              label="When the persona ends after 30 days, how should the farewell feel? *" 
              name="farewellStyle" 
              value={formData.farewellStyle} 
              onChange={handleChange}
              options={["Gentle and peaceful", "Encouraging and hopeful", "Symbolic and meaningful", "Celebration of memories"]}
            />
            <CheckboxGroup label="Should the AI help you build healthy coping habits along the way?" name="copingHabits" checked={formData.copingHabits} onChange={handleChange} />
          </div>
        );
      case 10:
        return (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-xl font-serif text-stone-800">Crisis-Safety Questions</h3>
            <p className="text-sm text-stone-500 mb-4">Important safety settings for your emotional wellbeing.</p>
            <CheckboxGroup label="Do you want the AI to check in on how you're coping emotionally?" name="emotionalCheckin" checked={formData.emotionalCheckin} onChange={handleChange} />
            <CheckboxGroup label="Should the AI offer grounding techniques if you're overwhelmed?" name="groundingTechniques" checked={formData.groundingTechniques} onChange={handleChange} />
            <TextAreaGroup label="How should the AI respond if you express severe distress? *" name="distressResponse" value={formData.distressResponse} onChange={handleChange} rows={3} />
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 mt-4">
              Important: If you're experiencing a mental health crisis, please contact a mental health professional, crisis hotline, or emergency services immediately. This AI is not a substitute for professional help.
            </div>
          </div>
        );
      default:
        return null;
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
              Step {step} of 10
            </h2>
            <div className="w-full bg-white/10 h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="h-full bg-white transition-all duration-500" style={{ width: `${(step / 10) * 100}%` }}></div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-2/3 p-8 md:p-16 flex flex-col bg-gradient-to-br from-white to-stone-50 overflow-y-auto max-h-[800px]">
          <form onSubmit={(e) => e.preventDefault()} className="flex-1 flex flex-col justify-center">
            {renderStep()}

            <div className="mt-12 flex justify-end gap-4 items-center">
              {step > 1 && <BackButton onClick={() => setStep((s) => s - 1)} />}
              {step < 10 ? (
                <ActionButton 
                  key="continue" 
                  type="button" 
                  onClick={handleNext}
                >
                  Continue &rarr;
                </ActionButton>
              ) : (
                <ActionButton 
                  key="save" 
                  type="button" 
                  variant="primary" 
                  disabled={submitting}
                  onClick={handleSave}
                >
                  {submitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Persona'}
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
    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-indigo-500 transition-colors">
      {label}
    </label>
    <input
      className={`w-full py-3 px-4 bg-white rounded-xl border border-stone-200 focus:border-indigo-500 outline-none transition-all text-lg text-stone-800 placeholder:text-stone-300 ${
        readOnly ? 'cursor-not-allowed text-stone-500' : ''
      }`}
      {...props}
    />
  </div>
);

const TextAreaGroup = ({ label, ...props }: any) => (
  <div className="group">
    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-indigo-500 transition-colors">
      {label}
    </label>
    <textarea
      className="w-full p-4 bg-white rounded-xl border border-stone-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all text-lg text-stone-700 placeholder:text-stone-300 leading-relaxed resize-none"
      {...props}
    />
  </div>
);

const SelectGroup = ({ label, options, ...props }: any) => (
  <div className="group">
    <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-indigo-500 transition-colors">
      {label}
    </label>
    <select
      className="w-full p-4 bg-white rounded-xl border border-stone-200 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all text-lg text-stone-700"
      {...props}
    >
      <option value="">Select a style...</option>
      {options.map((opt: string) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

const CheckboxGroup = ({ label, checked, onChange, name }: any) => (
  <label className="flex items-center gap-4 p-4 bg-white rounded-xl border border-stone-200 cursor-pointer hover:border-indigo-300 transition-all">
    <input
      type="checkbox"
      name={name}
      checked={checked}
      onChange={onChange}
      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
    />
    <span className="text-stone-700 font-medium">{label}</span>
  </label>
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
