import React, { useState, useEffect } from 'react';
import { UserProfile, Gender, Goal, ActivityLevel } from '../types';
import Button from '../components/Button';
import { saveUser } from '../services/db';
import { calculateTargets } from '../services/ai';
import { getCurrentUserName } from '../services/auth';
import { Activity, Target, User } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
  initialData?: UserProfile | null;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, initialData }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  
  // Use initialData if editing, otherwise use defaults and fetch name from Auth
  const [formData, setFormData] = useState<Partial<UserProfile>>(initialData || {
    name: '',
    age: 25,
    gender: Gender.Male,
    height: 170,
    weight: 70,
    goal: Goal.LoseWeight,
    activityLevel: ActivityLevel.Sedentary,
    dietaryRestrictions: 'None'
  });

  useEffect(() => {
    if (initialData) {
        setName(initialData.name);
    } else {
        const fetchName = async () => {
           const fetchedName = await getCurrentUserName();
           setName(fetchedName);
           setFormData(prev => ({...prev, name: fetchedName}));
        }
        fetchName();
    }
  }, [initialData]);

  const isEditing = !!initialData;

  const handleChange = (field: keyof UserProfile, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const user = formData as UserProfile;
      user.name = name; // Ensure name is set
      // Calculate calorie and protein targets
      const targets = await calculateTargets(user);
      user.targetCalories = targets.calories;
      user.targetProtein = targets.protein;
      
      await saveUser(user);
      
      onComplete();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
          <User size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Edit Profile' : 'Tell us about yourself'}</h2>
        <p className="text-slate-500">To build your personalized plan.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
        <input 
          type="text" 
          value={name} 
          disabled={true}
          className="w-full p-3 border border-slate-200 bg-slate-100 text-slate-500 rounded-lg cursor-not-allowed"
          title="Username cannot be changed"
        />
        <p className="text-xs text-slate-400 mt-1">Username is linked to your account registration.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
          <input 
            type="number" 
            value={formData.age} 
            onChange={(e) => handleChange('age', parseInt(e.target.value))}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
          <select 
            value={formData.gender} 
            onChange={(e) => handleChange('gender', e.target.value)}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Height (cm)</label>
          <input 
            type="number" 
            value={formData.height} 
            onChange={(e) => handleChange('height', parseInt(e.target.value))}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Weight (kg)</label>
          <input 
            type="number" 
            value={formData.weight} 
            onChange={(e) => handleChange('weight', parseInt(e.target.value))}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
          <Target size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Your Goals</h2>
        <p className="text-slate-500">What do you want to achieve?</p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">Goal</label>
        <div className="grid grid-cols-1 gap-3">
          {Object.values(Goal).map((g) => (
            <button
              key={g}
              onClick={() => handleChange('goal', g)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                formData.goal === g 
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                : 'border-slate-200 hover:border-emerald-200'
              }`}
            >
              <div className="font-semibold">{g}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
          <Activity size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Lifestyle</h2>
        <p className="text-slate-500">How active are you?</p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-slate-700">Activity Level</label>
        <div className="grid grid-cols-1 gap-3">
          {Object.values(ActivityLevel).map((l) => (
            <button
              key={l}
              onClick={() => handleChange('activityLevel', l)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                formData.activityLevel === l 
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                : 'border-slate-200 hover:border-emerald-200'
              }`}
            >
              <div className="font-semibold">{l}</div>
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Dietary Restrictions</label>
        <input 
          type="text" 
          value={formData.dietaryRestrictions} 
          onChange={(e) => handleChange('dietaryRestrictions', e.target.value)}
          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          placeholder="e.g. Vegan, Keto, None"
        />
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white max-w-lg w-full mx-auto md:my-10 md:rounded-2xl md:shadow-xl">
      <div className="w-full mb-8">
        <div className="flex justify-between mb-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={`h-2 rounded-full w-full mx-1 ${i <= step ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      <div className="w-full flex-1">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>

      <div className="w-full mt-8 flex gap-4">
        {step > 1 && (
          <Button variant="secondary" onClick={() => setStep(step - 1)} className="flex-1">
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)} className="flex-1">
            Next
          </Button>
        ) : (
          <Button onClick={handleFinish} isLoading={loading} className="flex-1">
            {isEditing ? 'Update Plan' : 'Create Plan'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;