import React, { useEffect, useState } from 'react';
import { UserProfile, DailyLog } from '../types';
import { getTodayLog } from '../services/db';
import { getDietAdjustments } from '../services/ai';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertCircle, Flame, Apple, TrendingUp } from 'lucide-react';
import Button from '../components/Button';

interface DashboardProps {
  user: UserProfile;
  setView: (view: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, setView }) => {
  const [log, setLog] = useState<DailyLog | null>(null);
  const [advice, setAdvice] = useState<{ suggestion: string, missingMacros: string } | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);

  useEffect(() => {
    const fetchLog = async () => {
        const todayLog = await getTodayLog();
        setLog(todayLog);
        
        if (todayLog.meals.length > 0) {
          setLoadingAdvice(true);
          getDietAdjustments(user, todayLog.meals)
            .then(setAdvice)
            .finally(() => setLoadingAdvice(false));
        }
    };
    fetchLog();
  }, [user]);

  if (!log) return <div>Loading...</div>;

  // Use explicit Number casting to avoid string concatenation issues if API returns strings
  const totalCalories = log.meals.reduce((sum, m) => sum + (Number(m.macros.calories) || 0), 0);
  const totalProtein = log.meals.reduce((sum, m) => sum + (Number(m.macros.protein) || 0), 0);
  const totalCarbs = log.meals.reduce((sum, m) => sum + (Number(m.macros.carbs) || 0), 0);
  const totalFat = log.meals.reduce((sum, m) => sum + (Number(m.macros.fat) || 0), 0);

  const remaining = Math.max(0, user.targetCalories - totalCalories);
  const progress = Math.min(100, (totalCalories / user.targetCalories) * 100);

  const data = [
    { name: 'Protein', value: totalProtein, color: '#10b981' }, // emerald-500
    { name: 'Carbs', value: totalCarbs, color: '#3b82f6' },   // blue-500
    { name: 'Fat', value: totalFat, color: '#f59e0b' },      // amber-500
  ];

  // If no data, show empty state in chart
  const chartData = totalCalories > 0 ? data : [{ name: 'Empty', value: 1, color: '#e2e8f0' }];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Hello, {user.name}</h1>
          <p className="text-slate-500 text-sm">Let's hit your goal of <span className="font-semibold text-emerald-600">{user.goal}</span></p>
        </div>
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border-2 border-emerald-200">
          {user.name.charAt(0)}
        </div>
      </header>

      {/* Main Stats Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Flame size={120} className="text-emerald-500" />
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative w-40 h-40 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={75}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-bold text-slate-800">{remaining}</span>
                <span className="text-xs text-slate-400 uppercase tracking-wider">Left</span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-4">
             <div className="flex justify-between items-end mb-2">
                <span className="text-lg font-semibold text-slate-700">Daily Calories</span>
                <span className="text-sm text-slate-500">{totalCalories} / {user.targetCalories} kcal</span>
             </div>
             <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
             </div>

             <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="bg-emerald-50 p-3 rounded-lg text-center">
                    <div className="text-xs text-emerald-600 font-medium uppercase">Protein</div>
                    <div className="font-bold text-slate-700">{Math.round(totalProtein)} / {user.targetProtein || '-'}g</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="text-xs text-blue-600 font-medium uppercase">Carbs</div>
                    <div className="font-bold text-slate-700">{Math.round(totalCarbs)}g</div>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg text-center">
                    <div className="text-xs text-amber-600 font-medium uppercase">Fat</div>
                    <div className="font-bold text-slate-700">{Math.round(totalFat)}g</div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* AI Insight */}
      <div className="bg-gradient-to-r from-violet-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
         <div className="absolute -right-10 -bottom-10 opacity-20">
            <TrendingUp size={150} />
         </div>
         <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <AlertCircle size={20} />
            AI Adjustment
         </h3>
         {loadingAdvice ? (
            <p className="opacity-80 animate-pulse">Analyzing your metabolism and recent meals...</p>
         ) : advice ? (
            <div className="relative z-10">
                <p className="mb-3 opacity-90 text-indigo-100 leading-relaxed">
                   To stay on track for your goal, your next meal should focus on <strong className="text-white">{advice.missingMacros}</strong>.
                </p>
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                    <span className="text-xs uppercase tracking-widest opacity-70">Recommended</span>
                    <p className="font-medium text-lg">{advice.suggestion}</p>
                </div>
            </div>
         ) : (
            <div className="relative z-10">
                <p className="opacity-80">Log your first meal to get personalized adjustments!</p>
                <Button variant="secondary" className="mt-4 text-indigo-600 border-none" onClick={() => setView('LOG_MEAL')}>
                    Log Meal
                </Button>
            </div>
         )}
      </div>

      {/* Recent Logs */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Today's Meals</h3>
        {log.meals.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                <Apple size={40} className="mx-auto mb-2 opacity-50" />
                <p>No meals logged yet today.</p>
            </div>
        ) : (
            <div className="space-y-3">
                {log.meals.map((meal, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {meal.image ? (
                                <img src={meal.image} alt={meal.name} className="w-12 h-12 rounded-lg object-cover" />
                            ) : (
                                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                                    <Apple size={20} />
                                </div>
                            )}
                            <div>
                                <h4 className="font-medium text-slate-800">{meal.name}</h4>
                                <p className="text-xs text-slate-500 capitalize">{meal.type} • {meal.macros.calories} kcal</p>
                            </div>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                            <div className="font-medium text-emerald-600">{meal.macros.protein || 0}g P</div>
                            <div>{new Date(meal.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;