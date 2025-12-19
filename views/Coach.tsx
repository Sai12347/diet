import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, MealLog } from '../types';
import { chatWithCoach, generateMealPlan, generateMealImage } from '../services/ai';
import { addMealToToday } from '../services/db';
import { Send, User, Sparkles, MessageSquare, Calendar, RefreshCw, ChevronRight, X, Clock, ChefHat, Plus, Image as ImageIcon, Flame, Activity } from 'lucide-react';
import Button from '../components/Button';

interface CoachProps {
  user: UserProfile;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

const Coach: React.FC<CoachProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'planner'>('chat');
  
  // Chat State
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'model', text: `Hi ${user.name}! I'm FitBot. I can help you adjust your diet, suggest recipes, or explain nutritional facts. How can I help today?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Planner State
  const [plan, setPlan] = useState<any>(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [mealType, setMealType] = useState<string>('');
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [loadingImage, setLoadingImage] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === 'chat') scrollToBottom();
  }, [messages, activeTab]);

  // Auto-generate image when viewing a recipe if not already present
  useEffect(() => {
    if (selectedMeal && !generatedImages[selectedMeal.name]) {
      const fetchImage = async () => {
        setLoadingImage(true);
        const img = await generateMealImage(selectedMeal.name);
        if (img) {
          setGeneratedImages(prev => ({ ...prev, [selectedMeal.name]: img }));
        }
        setLoadingImage(false);
      };
      fetchImage();
    }
  }, [selectedMeal]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const responseText = await chatWithCoach(history, userMsg.text);
        
        const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: responseText };
        setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
        setIsTyping(false);
    }
  };

  const handleGeneratePlan = async () => {
    setLoadingPlan(true);
    setPlan(null);
    try {
        const result = await generateMealPlan(user);
        setPlan(result);
    } catch (error) {
        console.error(error);
    } finally {
        setLoadingPlan(false);
    }
  };

  const handleAddToLog = async (meal: any, type: string) => {
    const newMeal: MealLog = {
      id: crypto.randomUUID(),
      name: meal.name,
      macros: {
        calories: Number(meal.calories),
        protein: Number(meal.protein),
        carbs: Number(meal.carbs),
        fat: Number(meal.fat),
      },
      timestamp: Date.now(),
      type: type.charAt(0).toUpperCase() + type.slice(1) as any,
      image: generatedImages[meal.name], // Use generated image if available
      notes: "Added from Meal Planner"
    };
    await addMealToToday(newMeal);
    alert("Meal added to your daily log!");
    setSelectedMeal(null);
  };

  const renderChat = () => (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${
              msg.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-br-none' 
                : 'bg-slate-100 text-slate-800 rounded-bl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-slate-100 p-4 rounded-2xl rounded-bl-none flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-2">
            <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Ask about your diet..."
            />
            <Button onClick={handleSend} disabled={isTyping || !input.trim()} className="rounded-xl px-4">
                <Send size={20} />
            </Button>
        </div>
      </div>
    </>
  );

  const renderPlanner = () => (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-50 relative">
      <div className="mb-6 flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold text-slate-800">Meal Planner</h2>
            <p className="text-sm text-slate-500">Curated for your {user.goal} goal</p>
        </div>
        <Button onClick={handleGeneratePlan} isLoading={loadingPlan} variant="primary" className="text-sm">
            <RefreshCw size={16} /> {plan ? 'Regenerate' : 'Generate'}
        </Button>
      </div>

      {loadingPlan && (
        <div className="flex flex-col items-center justify-center h-60 text-slate-400 space-y-4">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            <p className="animate-pulse">Chef AI is designing your menu options...</p>
        </div>
      )}

      {!loadingPlan && !plan && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <Sparkles size={40} className="mx-auto text-emerald-200 mb-4" />
            <h3 className="text-lg font-medium text-slate-700">No plan generated yet</h3>
            <p className="text-slate-400 mb-6">Get 3 personalized options for Breakfast, Lunch, and Dinner.</p>
            <Button onClick={handleGeneratePlan}>Create My Plan</Button>
        </div>
      )}

      {!loadingPlan && plan && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            {['breakfast', 'lunch', 'dinner'].map((type) => {
                const meals = plan[type];
                if(!meals || meals.length === 0) return null;

                return (
                    <div key={type} className="space-y-3">
                         <h3 className="text-lg font-bold text-slate-800 capitalize flex items-center gap-2">
                             {/* Icon based on type */}
                            {type === 'breakfast' && <span className="text-orange-400">🌅</span>}
                            {type === 'lunch' && <span className="text-yellow-500">☀️</span>}
                            {type === 'dinner' && <span className="text-indigo-400">🌙</span>}
                            {type} Options
                        </h3>
                        
                        <div className="flex overflow-x-auto gap-4 pb-4 snap-x">
                            {meals.map((meal: any, index: number) => (
                                <div key={index} className="min-w-[260px] md:min-w-[300px] bg-white rounded-xl p-4 shadow-sm border border-slate-100 snap-center flex flex-col hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Option {index + 1}</span>
                                        <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                            {meal.calories} kcal
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-slate-800 mb-1 line-clamp-1">{meal.name}</h4>
                                    <p className="text-xs text-slate-500 mb-3 line-clamp-2 flex-grow">{meal.description}</p>
                                    
                                    <div className="grid grid-cols-3 gap-1 text-center text-[10px] bg-slate-50 p-2 rounded-lg mb-3">
                                        <div><b className="text-slate-700">{meal.protein || 0}g</b> P</div>
                                        <div><b className="text-slate-700">{meal.carbs || 0}g</b> C</div>
                                        <div><b className="text-slate-700">{meal.fat || 0}g</b> F</div>
                                    </div>

                                    <Button 
                                        variant="secondary" 
                                        className="w-full text-xs py-2 mt-auto" 
                                        onClick={() => { setSelectedMeal(meal); setMealType(type); }}
                                    >
                                        View Recipe
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

             <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 mt-4 flex items-start gap-3">
                <Sparkles size={20} className="text-emerald-600 shrink-0 mt-1" />
                <p className="text-sm text-emerald-800">
                    Choose one option for each meal to create your perfect day! 
                    All suggestions are tailored to hit your <strong>{user.targetCalories} kcal</strong> and <strong>{user.targetProtein}g protein</strong> goal.
                </p>
            </div>
        </div>
      )}

      {/* Recipe Modal */}
      {selectedMeal && (
        <div className="absolute inset-0 z-50 bg-white animate-in slide-in-from-bottom-10 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <button 
                    onClick={() => setSelectedMeal(null)}
                    className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full"
                >
                    <X size={24} />
                </button>
                <span className="font-bold text-slate-800 capitalize">{mealType} Recipe</span>
                <div className="w-10"></div> {/* Spacer */}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">{selectedMeal.name}</h1>
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                    <span className="flex items-center gap-1"><Clock size={16} /> 20-30 mins</span>
                    <span className="flex items-center gap-1"><ChefHat size={16} /> Easy</span>
                </div>

                {/* Macro Nutrient Summary in Modal */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                    <div className="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                        <div className="flex justify-center mb-1 text-slate-400"><Flame size={16} /></div>
                        <div className="text-sm font-bold text-slate-700">{selectedMeal.calories}</div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-wide">Cals</div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl text-center border border-emerald-100">
                        <div className="flex justify-center mb-1 text-emerald-500"><Activity size={16} /></div>
                        <div className="text-sm font-bold text-emerald-700">{selectedMeal.protein || 0}g</div>
                        <div className="text-[10px] text-emerald-600 uppercase tracking-wide">Protein</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-xl text-center border border-blue-100">
                        <div className="text-sm font-bold text-blue-700 mt-5">{selectedMeal.carbs || 0}g</div>
                        <div className="text-[10px] text-blue-600 uppercase tracking-wide">Carbs</div>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl text-center border border-amber-100">
                         <div className="text-sm font-bold text-amber-700 mt-5">{selectedMeal.fat || 0}g</div>
                        <div className="text-[10px] text-amber-600 uppercase tracking-wide">Fat</div>
                    </div>
                </div>

                {/* Generated Image Section */}
                <div className="w-full h-56 bg-slate-100 rounded-2xl mb-6 overflow-hidden relative shadow-inner">
                    {loadingImage && !generatedImages[selectedMeal.name] && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                             <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                             <span className="text-xs">Cooking up an image...</span>
                        </div>
                    )}
                    {generatedImages[selectedMeal.name] ? (
                        <img src={generatedImages[selectedMeal.name]} alt={selectedMeal.name} className="w-full h-full object-cover animate-in fade-in duration-700" />
                    ) : !loadingImage && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                            <ImageIcon size={32} className="mb-2 opacity-50" />
                            <span className="text-sm">No image generated</span>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div>
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">1</span>
                            Ingredients
                        </h3>
                        <ul className="space-y-2">
                            {selectedMeal.ingredients?.map((ing: string, i: number) => (
                                <li key={i} className="flex items-start gap-3 text-slate-600 text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0"></span>
                                    {ing}
                                </li>
                            )) || <p className="text-slate-400 italic">No ingredients listed.</p>}
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">2</span>
                            Instructions
                        </h3>
                        <div className="space-y-4">
                            {selectedMeal.instructions?.map((inst: string, i: number) => (
                                <div key={i} className="flex gap-3 text-slate-600 text-sm">
                                    <span className="font-bold text-slate-300">{i+1}.</span>
                                    <p>{inst}</p>
                                </div>
                            )) || <p className="text-slate-400 italic">No instructions available.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
                <Button onClick={() => handleAddToLog(selectedMeal, mealType)} className="w-full py-3 shadow-lg shadow-emerald-200">
                    <Plus size={20} /> Add to Daily Log
                </Button>
            </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[85vh] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header / Tabs */}
      <div className="bg-white border-b border-slate-100">
        <div className="p-4 pb-0 flex gap-6">
            <button 
                onClick={() => setActiveTab('chat')}
                className={`pb-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'chat' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <MessageSquare size={18} /> Chat Coach
            </button>
            <button 
                onClick={() => setActiveTab('planner')}
                className={`pb-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'planner' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Calendar size={18} /> Meal Planner
            </button>
        </div>
      </div>

      {activeTab === 'chat' ? renderChat() : renderPlanner()}
    </div>
  );
};

export default Coach;