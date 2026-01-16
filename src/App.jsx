import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { 
  Home, PlusCircle, BarChart2, Settings, Mic, Trash2, AlertTriangle, 
  Calendar, DollarSign, PieChart as PieIcon,
  TrendingUp, Layers, Download, Upload, Search, Edit2, X, FileJson,
  ChevronLeft, ChevronRight,
  Utensils, Car, ShoppingBag, Gamepad2, Stethoscope, Briefcase, MoreHorizontal, Home as HomeIcon,
  Award, Gift, Clock,
  ArrowUpCircle, ArrowDownCircle, Wallet,
  Sparkles, Camera, Loader2, Bot // AI 相关图标
} from 'lucide-react';

// --- Gemini API 配置 ---
const apiKey = ""; // 运行时环境会自动注入 Key

// 通用 AI 调用函数
async function callGemini(prompt, imageBase64 = null) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  
  const parts = [{ text: prompt }];
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64
      }
    });
  }

  const payload = {
    contents: [{ parts }]
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

// --- 配置与工具 ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  
  if (isToday) return `今天 ${weekdays[d.getDay()]}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B', '#FF6384', '#36A2EB'];

// 分类配置
const CATEGORY_CONFIG = {
  // 支出类
  '餐饮': { icon: <Utensils size={24} />, color: 'bg-orange-100 text-orange-600' },
  '交通': { icon: <Car size={24} />, color: 'bg-blue-100 text-blue-600' },
  '购物': { icon: <ShoppingBag size={24} />, color: 'bg-pink-100 text-pink-600' },
  '娱乐': { icon: <Gamepad2 size={24} />, color: 'bg-purple-100 text-purple-600' },
  '居住': { icon: <HomeIcon size={24} />, color: 'bg-indigo-100 text-indigo-600' },
  '医疗': { icon: <Stethoscope size={24} />, color: 'bg-green-100 text-green-600' },
  // 收入类
  '工资': { icon: <Briefcase size={24} />, color: 'bg-emerald-100 text-emerald-600' },
  '奖金': { icon: <Award size={24} />, color: 'bg-yellow-100 text-yellow-600' },
  '理财': { icon: <TrendingUp size={24} />, color: 'bg-cyan-100 text-cyan-600' },
  '兼职': { icon: <Clock size={24} />, color: 'bg-blue-100 text-blue-600' },
  '红包': { icon: <Gift size={24} />, color: 'bg-red-100 text-red-600' },
  // 通用
  '其他': { icon: <MoreHorizontal size={24} />, color: 'bg-gray-100 text-gray-600' },
};

const EXPENSE_CATEGORIES = ['餐饮', '交通', '购物', '居住', '医疗', '娱乐', '其他'];
const INCOME_CATEGORIES = ['工资', '奖金', '理财', '兼职', '红包', '其他'];
const ALL_CATEGORY_NAMES = Object.keys(CATEGORY_CONFIG);

export default function App() {
  // --- 状态管理 ---
  const [activeTab, setActiveTab] = useState('home');
  const [transactions, setTransactions] = useState([]);
  const [monthlyBudget, setMonthlyBudget] = useState(5000); 
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  // 选中月份状态 (默认当月)
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // 删除确认弹窗状态
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });

  // 初始化数据
  useEffect(() => {
    const savedData = localStorage.getItem('smartflow_data');
    const savedBudget = localStorage.getItem('smartflow_budget');
    if (savedData) setTransactions(JSON.parse(savedData));
    if (savedBudget) setMonthlyBudget(parseFloat(savedBudget));
  }, []);

  // 保存数据
  useEffect(() => {
    localStorage.setItem('smartflow_data', JSON.stringify(transactions));
    localStorage.setItem('smartflow_budget', monthlyBudget.toString());
  }, [transactions, monthlyBudget]);

  // --- 核心逻辑 ---

  const handleMonthChange = (offset) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedMonth(newDate);
  };

  const selectedMonthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = new Date().getMonth() === selectedMonth.getMonth() && new Date().getFullYear() === selectedMonth.getFullYear();

  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonthStr));
  }, [transactions, selectedMonthStr]);

  const currentMonthExpenses = useMemo(() => {
    return monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [monthlyTransactions]);

  const budgetWarning = useMemo(() => {
    if (!isCurrentMonth) return { active: false, message: '' };

    const today = new Date();
    const totalDays = getDaysInMonth(today.getFullYear(), today.getMonth());
    const passedDays = today.getDate();
    const remainingDays = totalDays - passedDays;
    const remainingBudget = monthlyBudget - currentMonthExpenses;
    const budgetRatio = remainingBudget / monthlyBudget; 

    if (remainingDays < 10 && budgetRatio < 0.10 && remainingBudget > 0) {
      return {
        active: true,
        message: `⚠️ 月底省钱提醒：本月仅剩 ${remainingDays} 天，预算余额不足 10% (${(budgetRatio*100).toFixed(1)}%)，请坚持一下！`
      };
    } 
    else if (passedDays < 15 && budgetRatio < 0.20 && remainingBudget > 0) {
        return {
          active: true,
          message: `⚠️ 早期预警：才过 ${passedDays} 天，预算已消耗 ${(100 - budgetRatio*100).toFixed(1)}%，请控制节奏！`
        };
    }
    else if (remainingBudget <= 0) {
       return {
        active: true,
        message: `🚨 警报：本月预算已超支！目前超支 ${Math.abs(remainingBudget).toFixed(2)} 元。`
      };
    }
    return { active: false, message: '' };
  }, [monthlyBudget, currentMonthExpenses, isCurrentMonth]);

  const handleSaveTransaction = (transaction) => {
    if (editingTransaction) {
      setTransactions(transactions.map(t => t.id === transaction.id ? transaction : t));
    } else {
      setTransactions([transaction, ...transactions]);
    }
    setShowAddModal(false);
    setEditingTransaction(null);
  };

  const promptDelete = (id) => {
    setDeleteConfirm({ show: true, id });
  };

  const confirmDelete = () => {
    if (deleteConfirm.id) {
      setTransactions(transactions.filter(t => t.id !== deleteConfirm.id));
      setDeleteConfirm({ show: false, id: null });
    }
  };

  const handleDataImport = (importedData) => {
    setTransactions(importedData);
    alert('数据导入成功！');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeView 
          transactions={monthlyTransactions} 
          budget={monthlyBudget} 
          warning={budgetWarning}
          onDelete={promptDelete} 
          onEdit={(t) => { setEditingTransaction(t); setShowAddModal(true); }} 
        />;
      case 'stats':
        return <StatsView 
          transactions={transactions} 
          selectedMonth={selectedMonth} 
        />;
      case 'settings':
        return <SettingsView 
          budget={monthlyBudget} 
          setBudget={setMonthlyBudget} 
          onImport={handleDataImport}
        />;
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center text-gray-800 font-sans">
      <div className="w-full max-w-md bg-white shadow-xl min-h-screen flex flex-col relative overflow-hidden">
        
        <header className="bg-emerald-600 text-white p-4 pt-8 shadow-md z-10">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-lg font-bold flex items-center">
              <DollarSign className="w-5 h-5 mr-1" /> 智汇记账
            </h1>
            <div className="flex items-center bg-emerald-700/50 rounded-full px-2 py-1">
              <button onClick={() => handleMonthChange(-1)} className="p-1 hover:bg-emerald-600 rounded-full transition"><ChevronLeft size={16}/></button>
              <span className="mx-2 text-sm font-medium min-w-[80px] text-center">
                {selectedMonth.getFullYear()}年{selectedMonth.getMonth() + 1}月
              </span>
              <button onClick={() => handleMonthChange(1)} className="p-1 hover:bg-emerald-600 rounded-full transition"><ChevronRight size={16}/></button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
          {renderContent()}
        </main>

        <button 
          onClick={() => { setEditingTransaction(null); setShowAddModal(true); }}
          className="absolute bottom-20 right-4 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full shadow-lg transition-transform transform hover:scale-105 active:scale-95 z-20"
        >
          <PlusCircle size={28} />
        </button>

        <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center py-3 pb-6 z-10 text-xs">
          <NavButton icon={<Home size={22} />} label="首页" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavButton icon={<BarChart2 size={22} />} label="图表" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
          <NavButton icon={<Settings size={22} />} label="设置" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        {showAddModal && (
          <AddTransactionModal 
            initialData={editingTransaction} 
            onClose={() => setShowAddModal(false)} 
            onSave={handleSaveTransaction} 
          />
        )}

        {deleteConfirm.show && (
          <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center animate-fade-in px-4">
            <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl transform scale-100 transition-all">
              <h3 className="text-lg font-bold text-gray-800 mb-2">确认删除</h3>
              <p className="text-gray-500 text-sm mb-6">确定要删除这条记录吗？此操作无法撤销。</p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setDeleteConfirm({ show: false, id: null })}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 shadow-md shadow-red-200 transition"
                >
                  确定删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- 子组件 ---

function NavButton({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center space-y-1 ${active ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function HomeView({ transactions, budget, warning, onDelete, onEdit }) {
  const [searchTerm, setSearchTerm] = useState('');

  const { income, expense, balance } = useMemo(() => {
    const inc = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const exp = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { income: inc, expense: exp, balance: inc - exp };
  }, [transactions]);

  const budgetUsagePercent = Math.min((expense / budget) * 100, 100);
  let progressColor = 'bg-white/80';
  if (budgetUsagePercent > 100) progressColor = 'bg-red-400'; 
  else if (budgetUsagePercent >= 80) progressColor = 'bg-orange-300'; 

  const filteredTransactions = transactions.filter(t => {
    if (!searchTerm) return true;
    const lowerTerm = searchTerm.toLowerCase();
    return (
      t.category.includes(searchTerm) || 
      (t.note && t.note.toLowerCase().includes(lowerTerm)) ||
      t.amount.toString().includes(searchTerm)
    );
  });

  const groupedTransactions = useMemo(() => {
    const groups = {};
    const sorted = [...filteredTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sorted.forEach(t => {
      if (!groups[t.date]) {
        groups[t.date] = {
          date: t.date,
          items: [],
          totalExpense: 0,
          totalIncome: 0
        };
      }
      groups[t.date].items.push(t);
      if (t.type === 'expense') groups[t.date].totalExpense += t.amount;
      else groups[t.date].totalIncome += t.amount;
    });

    return Object.values(groups); 
  }, [filteredTransactions]);

  return (
    <div className="p-4 space-y-6">
      {/* Dashboard */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden transition-all duration-300">
        <div className="relative z-10 flex flex-col space-y-5">
          
          <div className="flex justify-between items-start text-center divide-x divide-emerald-400/30">
            <div className="flex-1 px-1">
              <div className="text-emerald-100 text-xs mb-1 flex items-center justify-center"><ArrowDownCircle size={12} className="mr-1"/> 收入</div>
              <div className="text-xl font-bold truncate">¥{income.toFixed(2)}</div>
            </div>
            <div className="flex-1 px-1">
              <div className="text-emerald-100 text-xs mb-1 flex items-center justify-center"><ArrowUpCircle size={12} className="mr-1"/> 支出</div>
              <div className="text-xl font-bold truncate">¥{expense.toFixed(2)}</div>
            </div>
            <div className="flex-1 px-1">
              <div className="text-emerald-100 text-xs mb-1 flex items-center justify-center"><Wallet size={12} className="mr-1"/> 结余</div>
              <div className="text-xl font-bold truncate">¥{balance.toFixed(2)}</div>
            </div>
          </div>

          <div>
             <div className="flex justify-between text-xs text-emerald-100 mb-1 opacity-80">
                <span>预算已用: {budgetUsagePercent.toFixed(1)}%</span>
                <span>预算限额: ¥{budget.toFixed(0)}</span>
              </div>
              <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ease-out ${progressColor}`} 
                  style={{ width: `${budgetUsagePercent}%` }}
                ></div>
              </div>
          </div>
        </div>
        <PieIcon className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 pointer-events-none" />
      </div>

      {warning.active && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start shadow-sm animate-pulse">
          <AlertTriangle className="text-red-500 w-6 h-6 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-800 font-bold text-sm">财务管家提醒</h3>
            <p className="text-red-700 text-xs mt-1">{warning.message}</p>
          </div>
        </div>
      )}

      <div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="搜索备注、分类或金额..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-100 rounded-xl pl-9 pr-8 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="space-y-5">
          {groupedTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              {searchTerm ? '未找到相关记录' : '本月暂无记录，快去记一笔吧'}
            </div>
          ) : (
            groupedTransactions.map(group => (
              <div key={group.date}>
                <div className="flex justify-between items-end mb-2 px-1">
                  <span className="text-sm font-bold text-gray-500">{formatDate(group.date)}</span>
                  <div className="text-xs text-gray-400 flex space-x-3">
                    {group.totalIncome > 0 && <span>收: {group.totalIncome.toFixed(2)}</span>}
                    {group.totalExpense > 0 && <span>支: {group.totalExpense.toFixed(2)}</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  {group.items.map((t) => {
                     const config = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG['其他'];
                     const isSelected = searchTerm === t.category;

                     return (
                      <div key={t.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group active:scale-[0.99] transition-transform">
                        <div className="flex items-center flex-1 min-w-0">
                          <div 
                            className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0 cursor-pointer ${config.color} ${isSelected ? 'ring-2 ring-offset-2 ring-emerald-400' : ''}`}
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSearchTerm(isSelected ? '' : t.category); 
                            }}
                          >
                            {config.icon}
                          </div>
                          
                          <div className="cursor-pointer flex-1 truncate" onClick={() => onEdit(t)}>
                            <div className="font-medium text-gray-800">{t.category}</div>
                            {t.note && <div className="text-xs text-gray-400 truncate">{t.note}</div>}
                          </div>
                        </div>

                        <div className="flex items-center flex-shrink-0 ml-2">
                          <span className={`font-bold mr-3 ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                            {t.type === 'income' ? '+' : '-'} {parseFloat(t.amount).toFixed(2)}
                          </span>
                          <button onClick={() => onEdit(t)} className="text-gray-300 hover:text-emerald-500 p-2">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); onDelete(t.id); }} className="text-gray-300 hover:text-red-400 p-2">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                     );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatsView({ transactions, selectedMonth }) {
  const [mainTab, setMainTab] = useState('trend'); 
  const [trendScope, setTrendScope] = useState('month'); 
  const [chartType, setChartType] = useState('line'); 
  const [dataType, setDataType] = useState('expense'); 
  
  // AI 分析相关状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisResult, setAnalysisResult] = useState("");

  const currentYear = selectedMonth.getFullYear();
  const currentMonth = selectedMonth.getMonth();

  const processData = useMemo(() => {
    const filteredData = transactions.filter(t => t.type === dataType);

    if (mainTab === 'category') {
      const categoryMap = {};
      filteredData.forEach(t => {
        const d = new Date(t.date);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          categoryMap[t.category] = (categoryMap[t.category] || 0) + parseFloat(t.amount);
        }
      });
      return Object.keys(categoryMap)
        .map(key => ({ name: key, value: categoryMap[key] }))
        .sort((a, b) => b.value - a.value);
    } else {
      if (trendScope === 'year') {
        const monthlyData = Array(12).fill(0).map((_, i) => ({
          name: `${i + 1}月`,
          value: 0
        }));
        filteredData.forEach(t => {
          const d = new Date(t.date);
          if (d.getFullYear() === currentYear) {
            monthlyData[d.getMonth()].value += parseFloat(t.amount);
          }
        });
        return monthlyData;
      } else {
        const daysInMonth = getDaysInMonth(currentYear, currentMonth);
        const dailyData = Array(daysInMonth).fill(0).map((_, i) => ({
          name: `${i + 1}日`,
          value: 0
        }));
        filteredData.forEach(t => {
          const d = new Date(t.date);
          if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
            dailyData[d.getDate() - 1].value += parseFloat(t.amount);
          }
        });
        return dailyData;
      }
    }
  }, [transactions, mainTab, trendScope, currentYear, currentMonth, dataType]);

  // AI 分析函数
  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    setShowAnalysis(true);
    setAnalysisResult(""); // 清空旧数据
    
    // 准备数据给 AI
    const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthlyData = transactions.filter(t => t.date.startsWith(currentMonthStr));
    
    // 简化数据以节省 Token
    const simplifiedData = monthlyData.map(t => ({
      d: t.date,
      t: t.type, // expense/income
      c: t.category,
      a: t.amount
    }));

    const prompt = `
      你是一位专业的财务顾问。请分析以下 ${currentYear}年${currentMonth+1}月 的个人收支数据 (JSON格式: d=日期, t=类型, c=分类, a=金额)。
      数据: ${JSON.stringify(simplifiedData)}
      
      请用中文给出简短的分析报告（Markdown格式），包含：
      1. 收支概况总结。
      2. 最大的支出领域是什么？
      3. 针对性的省钱或理财建议（幽默一点）。
      4. 给本月理财打个分（1-10分）。
    `;

    try {
      const result = await callGemini(prompt);
      setAnalysisResult(result);
    } catch (error) {
      setAnalysisResult("AI 分析服务暂时不可用，请稍后再试。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totalAmount = processData.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const chartColor = dataType === 'expense' ? '#10B981' : '#F59E0B'; 

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      <div className="flex bg-gray-100 p-1 rounded-xl mb-2">
        <button 
          onClick={() => setMainTab('trend')}
          className={`flex-1 flex items-center justify-center py-2 rounded-lg text-sm font-bold transition-all ${mainTab === 'trend' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
        >
          <TrendingUp className="w-4 h-4 mr-1" /> 趋势分析
        </button>
        <button 
          onClick={() => setMainTab('category')}
          className={`flex-1 flex items-center justify-center py-2 rounded-lg text-sm font-bold transition-all ${mainTab === 'category' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500'}`}
        >
          <Layers className="w-4 h-4 mr-1" /> 收支分布
        </button>
      </div>

      <div className="flex justify-between items-center px-1">
        {/* AI 分析入口按钮 */}
        <button
          onClick={handleAIAnalysis}
          className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-full text-xs font-bold shadow-md hover:scale-105 transition-transform"
        >
          <Bot size={14} />
          <span>AI 财务分析</span>
        </button>

        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setDataType('expense')} 
            className={`px-3 py-0.5 text-xs rounded transition-all ${dataType === 'expense' ? 'bg-white text-emerald-600 font-bold shadow-sm' : 'text-gray-400'}`}
          >
            支出
          </button>
          <button 
            onClick={() => setDataType('income')} 
            className={`px-3 py-0.5 text-xs rounded transition-all ${dataType === 'income' ? 'bg-white text-yellow-600 font-bold shadow-sm' : 'text-gray-400'}`}
          >
            收入
          </button>
        </div>
      </div>

      {mainTab === 'trend' && (
        <div className="flex flex-col space-y-2">
           <div className="flex justify-center items-center px-1 space-x-2">
              <button 
                onClick={() => setTrendScope('month')}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${trendScope === 'month' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold' : 'border-gray-200 text-gray-500 bg-white'}`}
              >
                本月 (日)
              </button>
              <button 
                onClick={() => setTrendScope('year')}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${trendScope === 'year' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold' : 'border-gray-200 text-gray-500 bg-white'}`}
              >
                本年 (月)
              </button>
              <div className="flex bg-gray-100 rounded-lg p-0.5 ml-auto">
                <button onClick={() => setChartType('line')} className={`p-1.5 rounded ${chartType === 'line' ? 'bg-white shadow text-emerald-600' : 'text-gray-400'}`}><TrendingUp size={16}/></button>
                <button onClick={() => setChartType('bar')} className={`p-1.5 rounded ${chartType === 'bar' ? 'bg-white shadow text-emerald-600' : 'text-gray-400'}`}><BarChart2 size={16}/></button>
              </div>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-1 min-h-[300px] flex flex-col">
        <div className="text-center mb-6">
          <h3 className="text-gray-500 text-xs mb-1">
            {mainTab === 'trend' ? (trendScope === 'month' ? `${currentMonth+1}月总${dataType === 'expense'?'支出':'收入'}` : `${currentYear}年总${dataType === 'expense'?'支出':'收入'}`) : `${currentMonth+1}月${dataType === 'expense'?'支出':'收入'}分类`}
          </h3>
          <div className={`text-2xl font-bold ${dataType === 'expense' ? 'text-gray-800' : 'text-yellow-600'}`}>¥ {totalAmount.toFixed(2)}</div>
        </div>

        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            {mainTab === 'category' ? (
              <PieChart>
                <Pie
                  data={processData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {processData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `¥${value.toFixed(2)}`} />
                <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{fontSize: '10px', paddingTop: '10px'}}/>
              </PieChart>
            ) : chartType === 'bar' ? (
              <BarChart data={processData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={trendScope === 'month' ? 4 : 0} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickCount={6} />
                <Tooltip cursor={{fill: '#f9fafb'}} formatter={(value) => [`¥${value}`, dataType === 'expense' ? '支出' : '收入']} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                <Bar dataKey="value" fill={chartColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            ) : (
              <LineChart data={processData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={trendScope === 'month' ? 4 : 0} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickCount={6} />
                <Tooltip formatter={(value) => [`¥${value}`, dataType === 'expense' ? '支出' : '收入']} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                <Line type="monotone" dataKey="value" stroke={chartColor} strokeWidth={3} dot={{r: 2, fill: chartColor, strokeWidth: 0}} activeDot={{r: 6}} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
      
      {mainTab === 'category' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
           {processData.map((item, idx) => (
            <div key={idx} className="flex justify-between p-3 border-b last:border-0 text-sm">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                {item.name}
              </div>
              <div className="font-medium">
                ¥ {item.value.toFixed(2)} 
                <span className="text-gray-400 text-xs ml-2">({((item.value / totalAmount) * 100).toFixed(0)}%)</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI 分析结果模态框 */}
      {showAnalysis && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center">
                <Sparkles className="mr-2" size={18}/> 智能财务顾问
              </h3>
              <button onClick={() => setShowAnalysis(false)} className="hover:bg-white/20 rounded-full p-1"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500 space-y-4">
                  <Loader2 className="animate-spin text-fuchsia-500" size={48} />
                  <p>正在分析您的账单数据...</p>
                  <p className="text-xs text-gray-400">Gemini 正在思考中 ✨</p>
                </div>
              ) : (
                <div className="prose prose-sm prose-emerald max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed text-gray-700">
                    {analysisResult}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function SettingsView({ budget, setBudget, onImport }) {
  const [tempBudget, setTempBudget] = useState(budget);

  const handleExport = () => {
    const dataStr = localStorage.getItem('smartflow_data');
    if (!dataStr) {
      alert('暂无数据可导出');
      return;
    }
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `智汇记账_备份_${new Date().toISOString().slice(0,10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.readAsText(file, "UTF-8");
    fileReader.onload = e => {
      try {
        const parsedData = JSON.parse(e.target.result);
        if (Array.isArray(parsedData)) {
          onImport(parsedData); 
        } else {
          alert("文件格式不正确");
        }
      } catch (err) {
        alert("文件读取失败");
      }
    };
  };

  const handleSaveBudget = () => {
    setBudget(parseFloat(tempBudget));
    alert('设置已保存');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-lg mb-4 text-gray-800">月度预算设置</h3>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">每月限制 (元)</label>
        <div className="relative mb-6">
          <DollarSign className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input 
            type="number" 
            value={tempBudget}
            onChange={(e) => setTempBudget(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-bold text-gray-800"
          />
        </div>
        <button 
          onClick={handleSaveBudget}
          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition"
        >
          保存设置
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center">
          <FileJson className="w-5 h-5 mr-2 text-emerald-600" /> 数据备份与恢复
        </h3>
        <div className="flex space-x-3">
          <button onClick={handleExport} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center transition-colors border border-emerald-200">
            <Download className="w-4 h-4 mr-2" /> 导出备份
          </button>
          <label className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center cursor-pointer transition-colors border border-blue-200">
            <Upload className="w-4 h-4 mr-2" /> 导入恢复
            <input type="file" onChange={handleImport} className="hidden" accept=".json" />
          </label>
        </div>
      </div>
    </div>
  );
}

function AddTransactionModal({ initialData, onClose, onSave }) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('餐饮');
  const [note, setNote] = useState('');
  const [type, setType] = useState('expense');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false); // AI 处理状态
  const [id, setId] = useState(null); 
  const fileInputRef = useRef(null); // 图片上传引用

  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount);
      setCategory(initialData.category);
      setNote(initialData.note || '');
      setType(initialData.type);
      setDate(initialData.date);
      setId(initialData.id);
    }
  }, [initialData]);

  const currentCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  // AI 智能解析文本
  const handleSmartParse = async () => {
    if (!note) {
      alert("请先在备注栏输入内容，例如：昨天打车花了50元");
      return;
    }
    
    setIsProcessingAI(true);
    const prompt = `
      请从以下文本中提取财务信息：
      文本: "${note}"
      当前可用分类: ${ALL_CATEGORY_NAMES.join(', ')}
      
      请返回纯 JSON 格式，不要包含 Markdown 标记：
      {
        "amount": number (金额),
        "category": string (从可用分类中选择最匹配的，如果没有匹配则选"其他"),
        "date": "YYYY-MM-DD" (根据文本推断日期，如果是“今天”则为 ${new Date().toISOString().split('T')[0]}，如果是“昨天”则推算),
        "type": "expense" | "income" (根据语义推断是支出还是收入)
      }
    `;

    try {
      const resultText = await callGemini(prompt);
      const cleanedJson = resultText.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanedJson);
      
      if (data.amount) setAmount(data.amount);
      if (data.category && ALL_CATEGORY_NAMES.includes(data.category)) setCategory(data.category);
      if (data.date) setDate(data.date);
      if (data.type) setType(data.type);
      
    } catch (e) {
      alert("AI 解析失败，请手动输入");
      console.error(e);
    } finally {
      setIsProcessingAI(false);
    }
  };

  // AI 拍照识图
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessingAI(true);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Data = reader.result.split(',')[1];
      const prompt = `
        这是一张收据或发票。请提取以下信息并以纯 JSON 格式返回 (无 Markdown)：
        {
          "amount": number (总金额),
          "date": "YYYY-MM-DD" (日期，如果找不到则返回当天),
          "category": string (从以下列表中选择最合适的: ${ALL_CATEGORY_NAMES.join(', ')}),
          "note": string (简短的商品或商家名称)
        }
      `;

      try {
        const resultText = await callGemini(prompt, base64Data);
        const cleanedJson = resultText.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanedJson);

        if (data.amount) setAmount(data.amount);
        if (data.category && ALL_CATEGORY_NAMES.includes(data.category)) setCategory(data.category);
        if (data.date) setDate(data.date);
        if (data.note) setNote(data.note);
        setType('expense'); // 默认图片识别为支出

      } catch (err) {
        alert("图片识别失败，请重试");
        console.error(err);
      } finally {
        setIsProcessingAI(false);
        // 清除 input value 允许重复上传同一张图
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
  };

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("您的浏览器不支持语音识别。");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setNote(transcript); // 语音识别后只填入备注，不自动解析，让用户决定是否点击“智能解析”
    };
    recognition.start();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount) return;
    onSave({
      id: id || generateId(),
      amount: parseFloat(amount),
      category,
      note,
      type,
      date
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center animate-fade-in backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl transform transition-transform duration-300 relative">
        
        {/* Loading Overlay */}
        {isProcessingAI && (
          <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center rounded-2xl">
            <Loader2 className="animate-spin text-emerald-600 mb-2" size={40} />
            <span className="text-emerald-700 font-bold">AI 正在识别中...</span>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center">
            {initialData ? '编辑记录' : '记一笔'}
            {!initialData && (
              // 只有新建时显示拍照按钮
              <>
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="ml-3 p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                  title="拍照识图"
                >
                  <Camera size={20} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                />
              </>
            )}
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          <button 
            onClick={() => {
              if (type !== 'expense') {
                setType('expense');
                setCategory(EXPENSE_CATEGORIES[0]); 
              }
            }}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${type === 'expense' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500'}`}
          >
            支出
          </button>
          <button 
            onClick={() => {
              if (type !== 'income') {
                setType('income');
                setCategory(INCOME_CATEGORIES[0]); 
              }
            }}
            className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${type === 'income' ? 'bg-white text-green-500 shadow-sm' : 'text-gray-500'}`}
          >
            收入
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500 font-bold text-lg">¥</span>
            <input 
              type="number" 
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-8 pr-12 py-3 text-2xl font-bold border-b-2 border-emerald-100 focus:border-emerald-500 outline-none transition-colors"
              autoFocus={!initialData} 
            />
          </div>

          <div className="grid grid-cols-4 gap-3 py-2">
            {currentCategories.map(cat => {
              const config = CATEGORY_CONFIG[cat];
              const isSelected = category === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${isSelected ? `bg-emerald-50 border-2 border-emerald-500 text-emerald-700 shadow-sm scale-105` : 'border border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                >
                  <div className={`mb-1 ${isSelected ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {config.icon}
                  </div>
                  <span className="text-xs font-medium">{cat}</span>
                </button>
              );
            })}
          </div>

          <div className="flex space-x-2">
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-1/3 bg-gray-50 rounded-lg px-3 py-2 text-sm outline-none border border-transparent focus:border-emerald-300 transition-colors"
            />
            <div className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="备注..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-gray-50 rounded-lg pl-3 pr-20 py-2 text-sm outline-none border border-transparent focus:border-emerald-300 transition-colors"
                />
                
                {/* 备注栏右侧的工具按钮 */}
                <div className="absolute right-1 top-1 flex space-x-1">
                   {/* 语音按钮 */}
                   <button 
                    type="button"
                    onClick={toggleListening}
                    className={`p-1.5 rounded-md transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-emerald-600'}`}
                    title="语音输入"
                  >
                    <Mic size={16} />
                  </button>

                  {/* 智能解析按钮 */}
                  <button
                    type="button"
                    onClick={handleSmartParse}
                    className="p-1.5 bg-violet-100 text-violet-600 rounded-md hover:bg-violet-200 transition-colors"
                    title="AI 智能解析文本"
                  >
                    <Sparkles size={16} />
                  </button>
                </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-200 transition-all mt-4"
          >
            {initialData ? '保存修改' : '确认保存'}
          </button>
        </form>
      </div>
    </div>
  );
}