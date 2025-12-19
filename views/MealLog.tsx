import React, { useState, useRef } from 'react';
import { Camera, Type, Check, X, Upload } from 'lucide-react';
import Button from '../components/Button';
import { analyzeMealImageOrText } from '../services/ai';
import { addMealToToday } from '../services/db';
import { MealLog, ViewState } from '../types';

interface MealLogProps {
  onComplete: () => void;
  setView: (view: ViewState) => void;
}

const MealLogView: React.FC<MealLogProps> = ({ onComplete, setView }) => {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [input, setInput] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Partial<MealLog> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix for API if needed, but Gemini SDK often handles it or needs specific parts.
        // We will keep the full string for display and strip for API inside the service if needed.
        setImagePreview(base64String);
        // Specifically for Gemini REST/SDK, usually we send base64 data without prefix.
        // The service layer handles this logic.
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if ((mode === 'text' && !input) || (mode === 'image' && !imagePreview)) return;

    setLoading(true);
    try {
      const dataToAnalyze = mode === 'image' && imagePreview 
        ? imagePreview.split(',')[1] // Send raw base64
        : input;
      
      const analysis = await analyzeMealImageOrText(dataToAnalyze, mode === 'image');
      
      setResult({
        name: analysis.name,
        macros: analysis.macros,
        image: imagePreview || undefined,
        timestamp: Date.now(),
        type: 'Lunch', // Default, user can change
        notes: analysis.advice
      });
    } catch (error) {
      alert("Failed to analyze meal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (result && result.name && result.macros) {
        // ID generation
        const newMeal: MealLog = {
            id: crypto.randomUUID(),
            name: result.name,
            macros: result.macros,
            timestamp: Date.now(),
            type: result.type as any || 'Snack',
            image: result.image,
            notes: result.notes
        };
        await addMealToToday(newMeal);
        onComplete();
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Log Meal</h2>
        <Button variant="ghost" onClick={() => setView('DASHBOARD')}>
            <X size={24} />
        </Button>
      </div>

      {!result ? (
        <>
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg mb-6">
            <button 
                className={`flex-1 py-2 rounded-md font-medium text-sm transition-all flex items-center justify-center gap-2 ${mode === 'text' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
                onClick={() => setMode('text')}
            >
                <Type size={16} /> Text
            </button>
            <button 
                className={`flex-1 py-2 rounded-md font-medium text-sm transition-all flex items-center justify-center gap-2 ${mode === 'image' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
                onClick={() => setMode('image')}
            >
                <Camera size={16} /> Photo
            </button>
          </div>

          <div className="flex-1">
            {mode === 'text' ? (
              <textarea 
                className="w-full h-40 p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-lg"
                placeholder="e.g. Grilled chicken breast with roasted vegetables and brown rice"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            ) : (
              <div 
                className="w-full h-60 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors relative overflow-hidden"
                onClick={() => fileInputRef.current?.click()}
              >
                 {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                 ) : (
                    <>
                        <Upload size={40} className="text-slate-400 mb-2" />
                        <span className="text-slate-500 font-medium">Click to upload photo</span>
                    </>
                 )}
                 <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                 />
              </div>
            )}
          </div>

          <div className="mt-6">
            <Button onClick={handleAnalyze} isLoading={loading} className="w-full py-4 text-lg">
                Analyze Meal
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {result.image && (
                    <div className="h-48 w-full bg-slate-100">
                        <img src={result.image} alt="Meal" className="w-full h-full object-cover" />
                    </div>
                )}
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <input 
                            value={result.name}
                            onChange={(e) => setResult({...result, name: e.target.value})}
                            className="text-xl font-bold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-emerald-500 outline-none bg-transparent w-full"
                        />
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-6">
                        {Object.entries(result.macros || {}).map(([key, val]) => (
                            <div key={key} className="bg-slate-50 p-2 rounded-lg text-center">
                                <div className="text-xs text-slate-400 uppercase">{key}</div>
                                <div className="font-semibold text-slate-700">{val}</div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 mb-4">
                        <h4 className="text-emerald-800 font-medium text-sm mb-1">Health Tip</h4>
                        <p className="text-emerald-700 text-sm">{result.notes}</p>
                    </div>

                    <div className="flex gap-2">
                        {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => (
                            <button
                                key={type}
                                onClick={() => setResult({...result, type: type as any})}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${result.type === type ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                <Button variant="secondary" onClick={() => setResult(null)} className="flex-1">
                    Discard
                </Button>
                <Button onClick={handleSave} className="flex-1">
                    <Check size={18} /> Save to Log
                </Button>
            </div>
        </div>
      )}
    </div>
  );
};

export default MealLogView;