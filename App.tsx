
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TOTAL_QUESTIONS, TEST_DURATION_SECONDS } from './constants';
import { Question, StudentData, TestAttempt, RationalNumber, AnsweredQuestion, User, AdminUser, TeacherUser, StudentUser, Class, Role, Prompts, Skill, SkillProfile, QuestionVector, ComplexityMapping, QuestionVectorConfig } from './types';
import { generateTestQuestions } from './services/questionService';
import { analyzeStudentHistory, analyzeClassForGroupings, analyzeSchoolTrends } from './services/geminiService';
import * as api from './services/mockService';
import NumberPad from './components/NumberPad';

declare const MathJax: any;

// --- Helper functions for new features ---
const getTimeOfDay = (): QuestionVector['time_of_day'] => {
    const hour = new Date().getHours();
    if (hour < 8) return 'before_school';
    if (hour < 10) return 'period_1';
    if (hour < 12) return 'period_2';
    if (hour < 14) return 'period_3';
    if (hour < 16) return 'period_4';
    return 'after_school';
};

const getTimeIntoTestBand = (seconds: number): QuestionVector['time_into_test_band'] => {
    if (seconds <= 10) return '0-10';
    if (seconds <= 40) return '10-40';
    if (seconds <= 70) return '40-70';
    if (seconds <= 100) return '70-100';
    if (seconds <= 120) return '100-120';
    if (seconds <= 140) return '120-140';
    if (seconds <= 150) return '150-160';
    if (seconds <= 160) return '160-170';
    if (seconds <= 170) return '170-180';
    return '170-180';
};


// --- Main App Component ---
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    const checkSession = () => {
      const user = api.getCurrentUser();
      setCurrentUser(user);
      setAuthStatus(user ? 'authenticated' : 'unauthenticated');
    };
    checkSession();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setAuthStatus('authenticated');
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setAuthStatus('unauthenticated');
  };

  if (authStatus === 'loading') {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      <AppHeader user={currentUser} onLogout={handleLogout} />
      <main className="w-full max-w-6xl mt-6">
        {currentUser.role === 'admin' && <AdminView />}
        {currentUser.role === 'teacher' && <TeacherView currentUser={currentUser as TeacherUser} />}
        {currentUser.role === 'student' && <StudentView currentUser={currentUser as StudentUser} />}
      </main>
    </div>
  );
}

// --- Login & Header ---
const LoginScreen: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const result = await api.login(email, password);
    setIsLoading(false);

    if (result.user) {
      onLogin(result.user);
    } else {
      setError(result.error || 'An unknown login error occurred.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-lg shadow-2xl">
            <h1 className="text-4xl text-center font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400 mb-6">
                Arithmetic Sprint
            </h1>
            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                    <label className="block font-medium">Username / Email</label>
                    <input 
                        type="text" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)}
                        placeholder="admin@sprint.com or student.aa1"
                        className="w-full p-3 mt-1 rounded bg-slate-200 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label className="block font-medium">Password</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full p-3 mt-1 rounded bg-slate-200 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
                 <div className="text-xs text-slate-500 dark:text-slate-400 text-center pt-4">
                    <p><b>Admin:</b> admin@sprint.com / admin</p>
                    <p><b>Teachers:</b> teachA@sprint.com / password</p>
                    <p><b>Students:</b> student.aa1 / password</p>
                </div>
            </form>
        </div>
    </div>
  );
};

const AppHeader: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => (
  <header className="w-full max-w-6xl flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md">
    <div>
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">
          Arithmetic Sprint
        </h1>
        <span className="text-sm text-slate-500 dark:text-slate-400 capitalize">{user.role} View</span>
    </div>
    <div className="text-right">
      <p className="font-semibold">{user.firstName} {user.surname}</p>
      <button onClick={onLogout} className="text-sm text-blue-500 hover:underline">Logout</button>
    </div>
  </header>
);

// --- Admin View ---
const AdminView: React.FC = () => {
    const [view, setView] = useState<'classes' | 'summary' | 'complexity' | 'users' | 'prompts'>('classes');
    const [allClasses, setAllClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);

    useEffect(() => {
        if (view === 'classes' && !selectedClass) {
            setIsLoadingClasses(true);
            api.getAllClasses()
                .then(setAllClasses)
                .catch(e => console.error(e))
                .finally(() => setIsLoadingClasses(false));
        }
    }, [view, selectedClass]);

    if (selectedClass) {
        return <ClassDetailView aClass={selectedClass} onBack={() => setSelectedClass(null)} />;
    }

    const navButtonClass = (buttonView: typeof view) => 
        `px-4 py-2 mr-2 rounded-t-lg transition-colors ${view === buttonView ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold mb-4">Admin Dashboard</h2>
            <nav className="mb-6 border-b border-slate-300 dark:border-slate-600">
                <button onClick={() => setView('classes')} className={navButtonClass('classes')}>All Classes</button>
                <button onClick={() => setView('summary')} className={navButtonClass('summary')}>School Summary</button>
                <button onClick={() => setView('users')} className={navButtonClass('users')}>User Management</button>
                <button onClick={() => setView('complexity')} className={navButtonClass('complexity')}>Complexity Editor</button>
                <button onClick={() => setView('prompts')} className={navButtonClass('prompts')}>Prompt Management</button>
            </nav>
            {view === 'classes' && (
                isLoadingClasses ? <p>Loading classes...</p> :
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allClasses.map(c => (
                         <button key={c.id} onClick={() => setSelectedClass(c)} className="p-6 bg-slate-200 dark:bg-slate-700 rounded-lg shadow hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-left">
                            <p className="font-bold text-xl">{c.name}</p>
                            <p>{c.studentIds.length} Students</p>
                        </button>
                    ))}
                </div>
            )}
            {view === 'summary' && <SchoolSummaryView />}
            {view === 'complexity' && <ComplexityEditor />}
            {view === 'users' && <UserManagement />}
            {view === 'prompts' && <PromptManagement />}
        </div>
    );
};

const ComplexityEditor: React.FC = () => {
    const [config, setConfig] = useState<Record<Skill, ComplexityMapping> | null>(null);
    const [vectorConfig, setVectorConfig] = useState<QuestionVectorConfig | null>(null);
    const [selectedSkill, setSelectedSkill] = useState<Skill>('int_addition');
    const [selectedBreakpoint, setSelectedBreakpoint] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        api.getComplexityConfig().then(config => {
            setConfig(config);
            const firstBreakpoint = Object.keys(config.int_addition)[0];
            setSelectedBreakpoint(firstBreakpoint ? Number(firstBreakpoint) : null);
        });
        api.getVectorConfig().then(setVectorConfig);
    }, []);

    const handleSave = async () => {
        if (!config) return;
        setIsSaving(true);
        await api.updateComplexityConfig(config);
        setIsSaving(false);
    };
    
    const handleSkillChange = (skill: Skill) => {
        setSelectedSkill(skill);
        if(config) {
            const firstBreakpoint = Object.keys(config[skill])[0];
            setSelectedBreakpoint(firstBreakpoint ? Number(firstBreakpoint) : null);
        }
    }

    const handleVectorChange = (vectorKey: string, option: string | number | boolean, isChecked: boolean) => {
        if (!config || selectedBreakpoint === null) return;

        const newConfig = JSON.parse(JSON.stringify(config));
        const currentBreakpointConfig = newConfig[selectedSkill][selectedBreakpoint] || {};
        let currentValues = currentBreakpointConfig[vectorKey];

        // Ensure currentValues is an array for easier logic
        if (currentValues === undefined) currentValues = [];
        if (!Array.isArray(currentValues)) currentValues = [currentValues];
        
        if (isChecked) {
            // Add the option if it's not already there
            // FIX: Cast currentValues to a wider type to allow pushing a generic primitive.
            if (!(currentValues as any[]).includes(option)) {
                (currentValues as any[]).push(option);
            }
        } else {
            // Remove the option
            currentValues = currentValues.filter((v: any) => v !== option);
        }

        // Simplify back to a single value if only one option is selected, or undefined if empty
        if (currentValues.length === 0) {
            delete currentBreakpointConfig[vectorKey];
        } else if (currentValues.length === 1) {
            currentBreakpointConfig[vectorKey] = currentValues[0];
        } else {
            currentBreakpointConfig[vectorKey] = currentValues;
        }
        
        newConfig[selectedSkill][selectedBreakpoint] = currentBreakpointConfig;
        setConfig(newConfig);
    };
    
    const handleAddBreakpoint = () => {
        const newBreakpointStr = prompt("Enter new complexity breakpoint (1-100):");
        if (newBreakpointStr) {
            const newBreakpoint = parseInt(newBreakpointStr);
            if (!isNaN(newBreakpoint) && newBreakpoint >= 1 && newBreakpoint <= 100 && config) {
                 const newConfig = JSON.parse(JSON.stringify(config));
                 if(!newConfig[selectedSkill][newBreakpoint]) {
                    newConfig[selectedSkill][newBreakpoint] = {};
                    setConfig(newConfig);
                    setSelectedBreakpoint(newBreakpoint);
                 } else {
                    alert("Breakpoint already exists.");
                 }
            } else {
                alert("Invalid number.")
            }
        }
    };
    
    const handleDeleteBreakpoint = () => {
        if (selectedBreakpoint !== null && config && confirm(`Are you sure you want to delete breakpoint ${selectedBreakpoint}?`)) {
            const newConfig = JSON.parse(JSON.stringify(config));
            delete newConfig[selectedSkill][selectedBreakpoint];
            setConfig(newConfig);
            // Select the first available breakpoint after deletion
            const firstBreakpoint = Object.keys(newConfig[selectedSkill])[0];
            setSelectedBreakpoint(firstBreakpoint ? Number(firstBreakpoint) : null);
        }
    };

    const inheritedVector = useMemo(() => {
        if (!config || selectedBreakpoint === null) return {};
        const mapping = config[selectedSkill];
        const applicableLevels = Object.keys(mapping)
            .map(Number)
            .filter(level => level <= selectedBreakpoint)
            .sort((a, b) => a - b);

        return applicableLevels.reduce((acc, level) => ({ ...acc, ...mapping[level] }), {});
    }, [config, selectedSkill, selectedBreakpoint]);

    if (!config || !vectorConfig) return <p>Loading complexity configuration...</p>;

    const skillOptions: {key: Skill, name: string}[] = [
        {key: 'int_addition', name: 'Integer Addition'},
        {key: 'int_subtraction', name: 'Integer Subtraction'},
        {key: 'int_multiplication', name: 'Integer Multiplication'},
        {key: 'int_division', name: 'Integer Division'},
        {key: 'fraction_add_sub', name: 'Fraction Add/Sub'},
        {key: 'fraction_mul_div', name: 'Fraction Mul/Div'},
    ];
    
    const breakpoints = Object.keys(config[selectedSkill]).map(Number).sort((a, b) => a - b);
    
    const vectorGroups = {
        "Magnitude & Sign": ['sign_pattern', 'result_sign', 'magnitude_band'],
        "Addition Properties": ['add_magnitude_band', 'add_digits_band', 'add_carries_count_band', 'add_has_cascade_carry'],
        "Subtraction Properties": ['sub_magnitude_band', 'sub_digits_band', 'sub_borrows_count_band', 'sub_has_cascade_borrow', 'sub_across_zero_column', 'sub_smaller_minus_larger'],
        "Multiplication Properties": ['mul_factor_difficulty_band', 'mul_any_factor_zero_or_one', 'mul_negative_structure', 'mul_one_is_multiple_of_other', 'mul_product_is_square'],
        "Division Properties": ['div_divisor_difficulty_band', 'div_quotient_difficulty_band', 'div_negative_structure', 'div_quotient_is_square'],
        "Fraction Properties": ['den_relationship_type'],
    };

    const relevantGroups = Object.keys(vectorGroups).filter(groupName => {
       const skillPrefix = selectedSkill.split('_')[0];
       if (skillPrefix === 'int' && groupName.toLowerCase().includes('fraction')) return false;
       if (skillPrefix === 'fraction' && !groupName.toLowerCase().includes('fraction')) return false;
       return true;
    });
    
    const currentBreakpointSettings = config[selectedSkill][selectedBreakpoint!] || {};
    
    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Question Complexity Editor</h3>
                <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 text-white px-4 py-2 rounded">
                    {isSaving ? 'Saving...' : 'Save Config'}
                </button>
            </div>
            
            <div className="mb-4">
                <label className="block font-medium">Select Skill</label>
                <select value={selectedSkill} onChange={e => handleSkillChange(e.target.value as Skill)} className="p-2 rounded bg-slate-200 dark:bg-slate-700">
                    {skillOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.name}</option>)}
                </select>
            </div>
            
            <div className="flex gap-6">
                <aside className="w-1/4">
                    <h4 className="font-semibold mb-2">Complexity Breakpoints</h4>
                    <div className="space-y-1">
                        {breakpoints.map(bp => (
                             <button key={bp} onClick={() => setSelectedBreakpoint(bp)} className={`w-full text-left p-2 rounded ${selectedBreakpoint === bp ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
                                Level {bp}
                            </button>
                        ))}
                    </div>
                     <button onClick={handleAddBreakpoint} className="w-full text-center p-2 rounded mt-2 bg-green-500 text-white hover:bg-green-600">
                        + Add Breakpoint
                    </button>
                </aside>

                <main className="w-3/4">
                    {selectedBreakpoint === null ? (
                        <p>Select a breakpoint to edit, or add a new one.</p>
                    ) : (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-semibold text-lg">Editing Breakpoint: {selectedBreakpoint}</h4>
                                <button onClick={handleDeleteBreakpoint} className="text-red-500 hover:underline text-sm">Delete</button>
                            </div>

                            <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-lg mb-6">
                                <h5 className="font-semibold mb-2 text-slate-500 dark:text-slate-400">Final Vector At This Level (with inheritance)</h5>
                                <div className="text-xs font-mono grid grid-cols-2 gap-x-4">
                                    {Object.entries(inheritedVector).map(([key, value]) => (
                                        <p key={key} className="truncate"><span className="text-slate-400">{key}:</span> {JSON.stringify(value)}</p>
                                    ))}
                                </div>
                            </div>

                            {relevantGroups.map(groupName => (
                                <div key={groupName} className="mb-4">
                                    <h5 className="font-semibold mb-2 border-b border-slate-300 dark:border-slate-600 pb-1">{groupName}</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {vectorGroups[groupName as keyof typeof vectorGroups].map(key => {
                                            const options = vectorConfig[key];
                                            if(!options) return null;
                                            
                                            const currentValues = currentBreakpointSettings[key as keyof QuestionVector];
                                            const valuesAsArray = Array.isArray(currentValues) ? currentValues : (currentValues !== undefined ? [currentValues] : []);

                                            return (
                                                <div key={key}>
                                                    <label className="block text-sm font-semibold capitalize mb-1">{key.replace(/_/g, ' ')}</label>
                                                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-md space-y-1">
                                                        {options.map(opt => (
                                                            <label key={String(opt)} className="flex items-center gap-2 cursor-pointer">
                                                                <input 
                                                                    type="checkbox"
                                                                    // FIX: Cast valuesAsArray to any[] to allow .includes() with a wider type.
                                                                    // `valuesAsArray` has a very specific literal union type, while `opt` is `string | number | boolean`.
                                                                    checked={(valuesAsArray as any[]).includes(opt)}
                                                                    onChange={e => handleVectorChange(key, opt, e.target.checked)}
                                                                    className="form-checkbox h-4 w-4 rounded text-blue-600"
                                                                />
                                                                <span className="text-sm">{String(opt)}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};


const PromptManagement: React.FC = () => {
    const [prompts, setPrompts] = useState<Prompts | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

    useEffect(() => {
        setIsLoading(true);
        api.getPrompts()
            .then(setPrompts)
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, []);

    const handleSave = async () => {
        if (!prompts) return;
        setIsSaving(true);
        setSaveStatus('idle');
        try {
            await api.updatePrompts(prompts);
            setSaveStatus('success');
        } catch (e) {
            console.error(e);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveStatus('idle'), 3000); // Reset status message after 3s
        }
    };
    
    if (isLoading) return <p>Loading prompts...</p>;
    if (!prompts) return <p>Could not load prompts.</p>;

    const handlePromptChange = (key: keyof Prompts, value: string) => {
        setPrompts(p => p ? { ...p, [key]: value } : null);
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold">AI Prompt Management</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Here you can customize the prompts sent to the Gemini API. This allows you to control the focus, tone, and length of the AI-generated analyses.
            </p>
            
            <div className="space-y-4">
                <div>
                    <label className="block font-semibold mb-1">Individual Student Analysis Prompt</label>
                    <textarea 
                        value={prompts.studentAnalysis}
                        onChange={(e) => handlePromptChange('studentAnalysis', e.target.value)}
                        className="w-full h-48 p-2 rounded bg-slate-200 dark:bg-slate-700 font-mono text-sm"
                    />
                </div>
                 <div>
                    <label className="block font-semibold mb-1">Class Grouping Analysis Prompt</label>
                    <textarea 
                        value={prompts.classAnalysis}
                        onChange={(e) => handlePromptChange('classAnalysis', e.target.value)}
                        className="w-full h-48 p-2 rounded bg-slate-200 dark:bg-slate-700 font-mono text-sm"
                    />
                </div>
                 <div>
                    <label className="block font-semibold mb-1">School-wide Executive Summary Prompt</label>
                    <textarea 
                        value={prompts.schoolAnalysis}
                        onChange={(e) => handlePromptChange('schoolAnalysis', e.target.value)}
                        className="w-full h-48 p-2 rounded bg-slate-200 dark:bg-slate-700 font-mono text-sm"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg disabled:bg-blue-400">
                    {isSaving ? 'Saving...' : 'Save All Prompts'}
                </button>
                {saveStatus === 'success' && <p className="text-green-500">Prompts saved successfully!</p>}
                {saveStatus === 'error' && <p className="text-red-500">Failed to save prompts.</p>}
            </div>
        </div>
    );
};


const SchoolSummaryView: React.FC = () => {
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleGetSummary = async () => {
        setIsLoading(true);
        setSummary('');
        try {
            const users = await api.getUsers();
            const studentUsers = users.filter(u => u.role === 'student');
            const profilePromises = studentUsers.map(s => api.getStudentProfile(s.id));
            const profiles = await Promise.all(profilePromises);
            
            const allStudentsData = studentUsers.map((s, i) => ({
                studentName: `${s.firstName} ${s.surname}`,
                data: profiles[i]
            })).filter(s => s.data);

            const result = await analyzeSchoolTrends(allStudentsData);
            setSummary(result);
        } catch (e) {
            console.error(e);
            setSummary('Could not generate school summary at this time.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div>
            <h3 className="text-xl font-semibold mb-4">School-wide Executive Summary</h3>
            <button onClick={handleGetSummary} disabled={isLoading} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg mb-4 disabled:bg-purple-300">
                {isLoading ? 'Analyzing All Students...' : 'Generate School Summary'}
            </button>
            {summary && (
                <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg whitespace-pre-wrap">{summary}</div>
            )}
        </div>
    );
};


const UserManagement: React.FC = () => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [formState, setFormState] = useState({ firstName: '', surname: '', email: '', password: '', role: 'teacher' as Role });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setIsLoading(true);
        api.getUsers()
            .then(setAllUsers)
            .catch(error => console.error("Failed to fetch users:", error))
            .finally(() => setIsLoading(false));
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
      e.preventDefault();
      const { role, firstName, surname, email, password } = formState;
      
      let userData: Omit<StudentUser, 'id'> | Omit<TeacherUser, 'id'>;
      if (role === 'student') {
        userData = { role: 'student', firstName, surname, password, locked: false };
      } else {
        userData = { role: 'teacher', firstName, surname, password, email };
      }

      try {
        const newUser = await api.createUser(userData);
        setAllUsers(prev => [...prev, newUser]);
        setFormState({ firstName: '', surname: '', email: '', password: '', role: 'teacher' as Role });
      } catch (error) {
        console.error("Failed to create user:", error);
      }
    }
    
    const teachers = allUsers.filter(u => u.role === 'teacher');
    const studentSearchResults = searchTerm 
        ? allUsers.filter(u => u.role === 'student' && `${u.firstName} ${u.surname}`.toLowerCase().includes(searchTerm.toLowerCase()))
        : [];
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h3 className="text-xl font-semibold mb-2">Create New User</h3>
                <form onSubmit={handleAddUser} className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg space-y-3">
                     <select value={formState.role} onChange={e => setFormState(s=> ({...s, role: e.target.value as Role}))} className="w-full p-2 rounded bg-slate-200 dark:bg-slate-600">
                        <option value="teacher">Teacher</option>
                        <option value="student">Student</option>
                    </select>
                    <input type="text" placeholder="First Name" value={formState.firstName} onChange={e => setFormState(s => ({...s, firstName: e.target.value}))} className="w-full p-2 rounded bg-slate-200 dark:bg-slate-600" required />
                    <input type="text" placeholder="Surname" value={formState.surname} onChange={e => setFormState(s => ({...s, surname: e.target.value}))} className="w-full p-2 rounded bg-slate-200 dark:bg-slate-600" required />
                    {formState.role !== 'student' && <input type="email" placeholder="Email" value={formState.email} onChange={e => setFormState(s => ({...s, email: e.target.value}))} className="w-full p-2 rounded bg-slate-200 dark:bg-slate-600" required />}
                    <input type="password" placeholder="Password" value={formState.password} onChange={e => setFormState(s => ({...s, password: e.target.value}))} className="w-full p-2 rounded bg-slate-200 dark:bg-slate-600" required />
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Create User</button>
                </form>
            </div>
            <div>
                <h3 className="text-xl font-semibold mb-2">Existing Teachers</h3>
                <div className="max-h-40 overflow-y-auto p-2 bg-slate-100 dark:bg-slate-700 rounded-lg mb-4">
                    {isLoading ? <p>Loading...</p> : teachers.map(user => (
                        <div key={user.id} className="p-2 border-b border-slate-300 dark:border-slate-600">
                            <p className="font-semibold">{user.firstName} {user.surname}</p>
                            {'email' in user && <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>}
                        </div>
                    ))}
                </div>
                <h3 className="text-xl font-semibold mb-2">Search Students</h3>
                 <input 
                    type="text" 
                    placeholder="Type to search for a student..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-2 rounded bg-slate-200 dark:bg-slate-700 mb-2"
                 />
                <div className="max-h-40 overflow-y-auto p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                   {studentSearchResults.map(user => (
                       <div key={user.id} className="p-2 border-b border-slate-300 dark:border-slate-600">
                           <p className="font-semibold">{user.firstName} {user.surname}</p>
                       </div>
                   ))}
                   {searchTerm && studentSearchResults.length === 0 && <p className="text-slate-500">No students found.</p>}
                </div>
            </div>
        </div>
    );
};

// --- Teacher View ---
const TeacherView: React.FC<{ currentUser: TeacherUser }> = ({ currentUser }) => {
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [teacherClasses, setTeacherClasses] = useState<Class[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateClass, setShowCreateClass] = useState(false);
    const [newClassName, setNewClassName] = useState('');

    useEffect(() => {
        setIsLoading(true);
        api.getClassesForTeacher(currentUser.id)
            .then(setTeacherClasses)
            .catch(error => console.error("Failed to fetch classes:", error))
            .finally(() => setIsLoading(false));
    }, [currentUser.id]);

    const handleCreateClass = async () => {
        if (!newClassName.trim()) return;
        try {
            const newClass = await api.createClass(newClassName, currentUser.id);
            setTeacherClasses(prev => [...prev, newClass]);
            setNewClassName('');
            setShowCreateClass(false);
            setSelectedClassId(newClass.id);
        } catch (error) {
            console.error("Failed to create class:", error);
        }
    };

    const selectedClass = teacherClasses.find(c => c.id === selectedClassId);
    if (selectedClass) {
        return <ClassDetailView aClass={selectedClass} onBack={() => setSelectedClassId(null)} />
    }

    if (isLoading) return <div>Loading dashboard...</div>

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold mb-4">Teacher Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {teacherClasses.map(c => (
                    <button key={c.id} onClick={() => setSelectedClassId(c.id)} className="p-6 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition-colors text-left">
                        <p className="font-bold text-xl">{c.name}</p>
                        <p>{c.studentIds.length} Students</p>
                    </button>
                ))}
                 <button onClick={() => setShowCreateClass(true)} className="p-6 bg-green-500 text-white rounded-lg shadow hover:bg-green-600 transition-colors flex items-center justify-center">
                    <span className="font-bold text-xl">+ Create Class</span>
                </button>
            </div>
            {showCreateClass && (
                <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <h3 className="text-xl font-semibold mb-2">New Class Name:</h3>
                    <div className="flex gap-2">
                        <input type="text" value={newClassName} onChange={e => setNewClassName(e.target.value)} className="flex-grow p-2 rounded bg-slate-200 dark:bg-slate-600" placeholder="e.g., Grade 5 Math" />
                        <button onClick={handleCreateClass} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg">Save</button>
                        <button onClick={() => setShowCreateClass(false)} className="bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const SkillProfileDisplay: React.FC<{profile: SkillProfile}> = ({profile}) => {
    const skills: {key: Skill, name: string}[] = [
        {key: 'int_addition', name: 'Int Add'},
        {key: 'int_subtraction', name: 'Int Sub'},
        {key: 'int_multiplication', name: 'Int Mul'},
        {key: 'int_division', name: 'Int Div'},
        {key: 'fraction_add_sub', name: 'Frac Add/Sub'},
        {key: 'fraction_mul_div', name: 'Frac Mul/Div'},
    ];

    return (
        <div className="grid grid-cols-3 gap-2 text-center">
            {skills.map(skill => {
                const score = profile[skill.key] || 0;
                const color = score > 60 ? 'bg-green-500' : score > 30 ? 'bg-yellow-500' : 'bg-red-500';
                return (
                    <div key={skill.key} className="p-2 bg-slate-200 dark:bg-slate-700 rounded">
                        <p className="text-sm font-semibold">{skill.name}</p>
                        <p className={`text-lg font-bold ${color} text-white rounded mt-1`}>{score.toFixed(0)}</p>
                    </div>
                )
            })}
        </div>
    )
}

const StudentDetailModal: React.FC<{ student: StudentUser, profile: StudentData | null, onClose: () => void }> = ({ student, profile, onClose }) => {
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const getSummary = async () => {
            setIsLoading(true);
            if (!profile || !profile.history || profile.history.length === 0) {
                setSummary("This student has not completed any tests yet. The AI summary will be available after their first attempt.");
                setIsLoading(false);
                return;
            }
            if (profile.history.reduce((acc, cv) => acc + cv.answeredQuestions.length, 0) < 10) {
              setSummary("Complete a few more tests to unlock detailed, long-term feedback and analysis from the tutor.");
              setIsLoading(false);
              return;
            }

            const result = await analyzeStudentHistory(profile.history);
            setSummary(result);
            setIsLoading(false);
        };
        getSummary();
    }, [profile]);

    // Handle modal closing with Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-600 pb-3 mb-4">
                    <h3 className="text-2xl font-bold">{student.firstName} {student.surname}</h3>
                    <button onClick={onClose} className="text-3xl font-light hover:text-red-500 transition-colors">&times;</button>
                </div>
                {profile && <SkillProfileDisplay profile={profile.skillProfile} />}
                <div className="flex-grow overflow-y-auto pr-2 mt-4">
                    <h4 className="font-semibold text-lg mb-2">AI Performance Summary</h4>
                    <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg min-h-[200px]">
                        {isLoading ? (
                           <div className="animate-pulse flex space-x-4">
                             <div className="flex-1 space-y-3 py-1">
                               <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded"></div>
                               <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded w-5/6"></div>
                               <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded"></div>
                               <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded w-4/6"></div>
                             </div>
                           </div>
                         ) : (
                           <p className="whitespace-pre-wrap">{summary}</p>
                         )}
                    </div>
                </div>
                 <div className="mt-4 pt-4 border-t border-slate-300 dark:border-slate-600 text-right">
                    <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg">Close</button>
                </div>
            </div>
        </div>
    );
};


const ClassDetailView: React.FC<{aClass: Class, onBack: () => void}> = ({ aClass, onBack }) => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [students, setStudents] = useState<StudentUser[]>([]);
    const [studentProfiles, setStudentProfiles] = useState<Record<string, StudentData>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState<StudentUser | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [classGroupings, setClassGroupings] = useState('');
    const [isLoadingGroupings, setIsLoadingGroupings] = useState(false);
    const [showCreateStudent, setShowCreateStudent] = useState(false);
    const [newStudentForm, setNewStudentForm] = useState({ firstName: '', surname: '', password: '' });

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const users = await api.getUsers();
            setAllUsers(users);
            const studentIds = aClass.studentIds;
            const studentUsers = users.filter(u => u.role === 'student' && studentIds.includes(u.id)) as StudentUser[];
            setStudents(studentUsers);
            
            const profilePromises = studentUsers.map(student => 
                api.getStudentProfile(student.id).catch(err => {
                    console.error(`Failed to load profile for ${student.id}`, err);
                    return null;
                })
            );
            const resolvedProfiles = await Promise.all(profilePromises);
            
            const profiles: Record<string, StudentData> = {};
            studentUsers.forEach((student, index) => {
                if (resolvedProfiles[index]) {
                    profiles[student.id] = resolvedProfiles[index] as StudentData;
                }
            });
            setStudentProfiles(profiles);
        } catch (error) {
            console.error("Failed to fetch class details:", error);
        } finally {
            setIsLoading(false);
        }
    }, [aClass.studentIds]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const availableStudents = allUsers.filter(u => u.role === 'student' && !aClass.studentIds.includes(u.id) && `${u.firstName} ${u.surname}`.toLowerCase().includes(searchTerm.toLowerCase()));

    const toggleLock = async (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if(!student) return;
        try {
            const updatedStudent = await api.updateUser(studentId, { locked: !student.locked });
            setStudents(prev => prev.map(s => s.id === studentId ? updatedStudent as StudentUser : s));
        } catch(e) { console.error(e); }
    };

    const addStudent = async (studentId: string) => {
        try {
            await api.addStudentToClass(aClass.id, studentId);
            fetchData();
        } catch (e) { console.error(e); }
    };
    
    const toggleLockAll = async (lock: boolean) => {
        try {
            const promises = students.map(s => api.updateUser(s.id, { locked: lock }));
            await Promise.all(promises);
            fetchData();
        } catch (e) { console.error(e); }
    };

    const handleCreateAndAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        const { firstName, surname, password } = newStudentForm;
        if (!firstName.trim() || !surname.trim() || !password.trim()) return;
        try {
            await api.createStudentAndAddToClass({firstName, surname, password}, aClass.id);
            setNewStudentForm({ firstName: '', surname: '', password: '' });
            setShowCreateStudent(false);
            fetchData();
        } catch (e) { console.error(e); }
    };

    const handleGetGroupings = async () => {
      setIsLoadingGroupings(true);
      setClassGroupings('');
      try {
        const studentDataForClass = students
          .map(s => ({
            studentName: `${s.firstName} ${s.surname}`,
            data: studentProfiles[s.id]
          }))
          .filter(s => s.data); 
        const trends = await analyzeClassForGroupings(studentDataForClass);
        setClassGroupings(trends);
      } catch (e) {
        console.error(e);
        setClassGroupings("Could not analyze groupings at this time.");
      } finally {
        setIsLoadingGroupings(false);
      }
    };

    if (isLoading) return <div>Loading class details...</div>;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
            {selectedStudent && (
              <StudentDetailModal 
                  student={selectedStudent} 
                  profile={studentProfiles[selectedStudent.id]} 
                  onClose={() => setSelectedStudent(null)} 
              />
            )}
            <button onClick={onBack} className="text-blue-500 mb-4">&larr; Back to Dashboard</button>
            <h2 className="text-3xl font-bold mb-4">{aClass.name}</h2>
            <div className="mb-6 flex flex-wrap gap-2">
                <button onClick={() => toggleLockAll(true)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm">Lock All</button>
                <button onClick={() => toggleLockAll(false)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm">Unlock All</button>
                <button onClick={handleGetGroupings} disabled={isLoadingGroupings} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg text-sm disabled:bg-purple-300">
                  {isLoadingGroupings ? 'Analyzing...' : 'Get Student Groupings'}
                </button>
            </div>
             {classGroupings && (
                <div className="mb-6 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <h4 className="font-semibold text-lg mb-2">AI-Generated Student Groups</h4>
                    <p className="whitespace-pre-wrap">{classGroupings}</p>
                </div>
             )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold mb-2">Enrolled Students ({students.length})</h3>
                     <div className="max-h-96 overflow-y-auto space-y-2 p-2 bg-slate-100 dark:bg-slate-900 rounded-lg">
                        {students.length === 0 && <p className="text-slate-500">No students enrolled yet.</p>}
                        {students.map(s => {
                            const profile = studentProfiles[s.id];
                            const avgScore = profile ? (Object.values(profile.skillProfile).reduce((a, b) => a + b, 0) / Object.keys(profile.skillProfile).length).toFixed(0) : 'N/A';
                            return (
                                <div key={s.id} className="flex justify-between items-center p-2 bg-slate-200 dark:bg-slate-700 rounded">
                                    <button onClick={() => setSelectedStudent(s)} className="text-left flex-grow hover:underline">
                                        {s.firstName} {s.surname} (Avg Skill: {avgScore})
                                    </button>
                                    <button onClick={() => toggleLock(s.id)} className={`px-3 py-1 text-xs rounded-full ${s.locked ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>{s.locked ? 'Locked' : 'Unlocked'}</button>
                                </div>
                            )
                        })}
                     </div>
                </div>
                <div>
                     <h3 className="text-xl font-semibold mb-2">Add Student</h3>
                     <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                         <h4 className="font-semibold mb-2">Add Existing Student</h4>
                         <input type="text" placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 rounded bg-slate-200 dark:bg-slate-600 mb-2" />
                         <div className="max-h-40 overflow-y-auto space-y-2">
                            {availableStudents.map(s => (
                                 <div key={s.id} className="flex justify-between items-center p-2 bg-slate-200 dark:bg-slate-800 rounded">
                                    <span>{s.firstName} {s.surname}</span>
                                    <button onClick={() => addStudent(s.id)} className="px-3 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600">+</button>
                                </div>
                            ))}
                         </div>
                         <hr className="my-4 border-slate-300 dark:border-slate-600"/>
                         <button onClick={() => setShowCreateStudent(!showCreateStudent)} className="text-blue-500 hover:underline w-full text-left font-semibold">
                            {showCreateStudent ? '▼' : '▶'} Create & Add New Student
                         </button>
                         {showCreateStudent && (
                            <form onSubmit={handleCreateAndAddStudent} className="space-y-3 mt-2">
                                <input type="text" placeholder="First Name" value={newStudentForm.firstName} onChange={e => setNewStudentForm(s => ({...s, firstName: e.target.value}))} className="w-full p-2 rounded bg-slate-200 dark:bg-slate-600" required />
                                <input type="text" placeholder="Surname" value={newStudentForm.surname} onChange={e => setNewStudentForm(s => ({...s, surname: e.target.value}))} className="w-full p-2 rounded bg-slate-200 dark:bg-slate-600" required />
                                <input type="password" placeholder="Password" value={newStudentForm.password} onChange={e => setNewStudentForm(s => ({...s, password: e.target.value}))} className="w-full p-2 rounded bg-slate-200 dark:bg-slate-600" required />
                                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Create & Add</button>
                            </form>
                         )}
                     </div>
                </div>
            </div>
        </div>
    )
};


// --- Student View ---
const StudentView: React.FC<{ currentUser: StudentUser }> = ({ currentUser }) => {
  const [gameState, setGameState] = useState<'idle' | 'testing' | 'results'>('idle');
  const [lastAttempt, setLastAttempt] = useState<TestAttempt | null>(null);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [complexityConfig, setComplexityConfig] = useState<Record<Skill, ComplexityMapping> | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    Promise.all([
        api.getStudentProfile(currentUser.id),
        api.getComplexityConfig()
    ]).then(([studentProfile, config]) => {
        setStudentData(studentProfile);
        setComplexityConfig(config);
    }).catch(error => console.error("Failed to load student data:", error));
    
    const onFullScreenChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
  }, [currentUser.id]);
  
  const handleTestComplete = async (attempt: TestAttempt) => {
    try {
        const newStudentData = await api.updateStudentProfileAfterTest(currentUser.id, attempt);
        setStudentData(newStudentData);
        setLastAttempt(attempt);
        setGameState('results');
    } catch (e) {
        console.error(e);
        setLastAttempt(attempt);
        setGameState('results');
    }
  };

  const handleFullScreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(console.error);
    } else {
        document.exitFullscreen();
    }
  };
  
  if (currentUser.locked) {
     return (
        <div className="text-center bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg">
          <h2 className="text-3xl font-bold mb-2 text-red-500">Access Locked</h2>
          <p className="text-xl">Your teacher has temporarily locked your access to the test.</p>
        </div>
     )
  }

  if (!studentData || !complexityConfig) {
    return <div>Loading your profile...</div>
  }

  if (gameState === 'testing') {
    return <TestScreen 
        studentProfile={studentData.skillProfile}
        onComplete={handleTestComplete} 
        complexityConfig={complexityConfig}
    />;
  }

  if (gameState === 'results' && lastAttempt) {
    return <ResultsScreen attempt={lastAttempt} studentHistory={studentData.history} onRestart={() => setGameState('idle')} />;
  }
  
  const isFirstTime = studentData.history.length === 0;

  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold mb-2">Welcome back, {currentUser.firstName}!</h2>
      <div className="my-4 max-w-md mx-auto">
        <h3 className="text-xl font-semibold mb-2">Your Current Skill Profile</h3>
        <SkillProfileDisplay profile={studentData.skillProfile} />
      </div>
       <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={handleFullScreen} className="bg-slate-500 hover:bg-slate-600 text-white font-bold py-2 px-5 rounded-lg text-md">
                 {isFullScreen ? 'Exit Full Screen' : 'Enter Full Screen'}
             </button>
            <button
              onClick={() => setGameState('testing')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition-transform transform hover:scale-105"
            >
              {isFirstTime ? 'Start First Test' : 'Start Test'}
            </button>
       </div>
      <div className="mt-8">
        <h3 className="text-2xl font-semibold mb-4">Past Attempts</h3>
        <div className="max-h-60 overflow-y-auto bg-white dark:bg-slate-800 p-4 rounded-lg shadow-inner">
          {studentData.history.length === 0 ? <p>No history yet.</p> :
            [...studentData.history].reverse().map((att, i) => (
                <div key={i} className="flex justify-between items-center p-2 border-b border-slate-200 dark:border-slate-700">
                    <span>{new Date(att.date).toLocaleDateString()}</span>
                    <span>Score: {att.totalScore} ({att.correctCount}/{TOTAL_QUESTIONS})</span>
                </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};


// --- Components that were previously in separate files or top-level ---

interface TestScreenProps {
  studentProfile: SkillProfile;
  onComplete: (attempt: TestAttempt) => void;
  complexityConfig: Record<Skill, ComplexityMapping>;
}

const TestScreen: React.FC<TestScreenProps> = ({ studentProfile, onComplete, complexityConfig }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION_SECONDS);
  const [answeredQuestions, setAnsweredQuestions] = useState<AnsweredQuestion[]>([]);
  
  const [intAnswer, setIntAnswer] = useState('');
  const [numAnswer, setNumAnswer] = useState('');
  const [denAnswer, setDenAnswer] = useState('');
  const [activeInput, setActiveInput] = useState<'int' | 'num' | 'den'>('int');

  const questionStartTimeRef = useRef<number>(Date.now());
  const timeIntoTestRef = useRef<number>(0);

  useEffect(() => {
    const newQuestions = generateTestQuestions(studentProfile, complexityConfig);
    setQuestions(newQuestions);
    setAnsweredQuestions([]);
    questionStartTimeRef.current = Date.now();
    timeIntoTestRef.current = 0;

    if (newQuestions[0]?.type === 'integer') {
        setActiveInput('int');
    } else {
        setActiveInput('num');
    }
  }, [studentProfile, complexityConfig]);

  useEffect(() => {
    if (typeof MathJax !== 'undefined') {
        MathJax.typesetPromise();
    }
  }, [currentQuestionIndex, questions]);

  const processAnswer = useCallback((
    question: Question, 
    intAns: string, 
    numAns: string, 
    denAns: string,
    startTime: number
  ): AnsweredQuestion => {
      let isCorrect = false;
      let submittedAnswer = '';
      const timeTakenSeconds = Math.round((Date.now() - startTime) / 1000);
      timeIntoTestRef.current += timeTakenSeconds;

      if (question.type === 'integer') {
          isCorrect = parseInt(intAns) === question.answer;
          submittedAnswer = intAns || 'N/A';
      } else if (question.type === 'rational' && typeof question.answer === 'object') {
          const qAns = question.answer as RationalNumber;
          isCorrect = parseInt(numAns) === qAns.num && parseInt(denAns) === qAns.den;
          submittedAnswer = `${numAns || '?'}/${denAns || '?'}`;
      }

      const contextualFeatures: Partial<QuestionVector> = {
          question_number: currentQuestionIndex + 1,
          time_into_test_band: getTimeIntoTestBand(timeIntoTestRef.current),
          time_of_day: getTimeOfDay(),
      };

      return { 
          questionText: question.text, 
          submittedAnswer, 
          isCorrect, 
          timeTakenSeconds,
          operands: question.operands,
          features: { ...question.features, ...contextualFeatures },
          skill: question.skill,
          complexity: question.complexity,
      };
  }, [currentQuestionIndex]);

  const endTest = useCallback((finalAnswers: AnsweredQuestion[]) => {
    const correctCount = finalAnswers.filter(r => r.isCorrect).length;

    onComplete({
        date: new Date().toISOString(),
        correctCount,
        timeRemaining: timeLeft,
        totalScore: correctCount, // Simplified score
        answeredQuestions: finalAnswers,
    });
  }, [onComplete, timeLeft]);

  const handleNextQuestion = useCallback(() => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const newAnswer = processAnswer(currentQuestion, intAnswer, numAnswer, denAnswer, questionStartTimeRef.current);
    const updatedAnswers = [...answeredQuestions, newAnswer];
    setAnsweredQuestions(updatedAnswers);

    setIntAnswer('');
    setNumAnswer('');
    setDenAnswer('');
    questionStartTimeRef.current = Date.now(); 

    if (currentQuestionIndex >= TOTAL_QUESTIONS - 1) {
      endTest(updatedAnswers);
    } else {
      const nextQuestion = questions[currentQuestionIndex + 1];
      setCurrentQuestionIndex(i => i + 1);
      if (nextQuestion?.type === 'integer') {
        setActiveInput('int');
      } else {
        setActiveInput('num');
      }
    }
  }, [questions, currentQuestionIndex, intAnswer, numAnswer, denAnswer, answeredQuestions, endTest, processAnswer]);
  
  const handleKeyPress = useCallback((key: string) => {
    const updateState = (setter: React.Dispatch<React.SetStateAction<string>>) => {
        setter(prev => {
            if (key === 'Backspace') return prev.slice(0, -1);
            if (key === '-' && prev.length === 0) return '-';
            if (!isNaN(parseInt(key))) return prev + key;
            return prev;
        });
    };

    if(activeInput === 'int') updateState(setIntAnswer);
    if(activeInput === 'num') updateState(setNumAnswer);
    if(activeInput === 'den') updateState(setDenAnswer);
  }, [activeInput]);
  
  useEffect(() => {
    const timerId = setTimeout(() => {
        if (timeLeft <= 0) {
            const finalAnswer = processAnswer(questions[currentQuestionIndex], intAnswer, numAnswer, denAnswer, questionStartTimeRef.current);
            endTest([...answeredQuestions, finalAnswer]);
        } else {
            setTimeLeft(t => t - 1);
        }
    }, 1000);
    return () => clearTimeout(timerId);
  }, [timeLeft, endTest, questions, currentQuestionIndex, answeredQuestions, intAnswer, numAnswer, denAnswer, processAnswer]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleNextQuestion();
            return;
        }

        const currentQuestion = questions[currentQuestionIndex];
        if (currentQuestion?.type === 'rational') {
            if (e.key === 'ArrowDown' || e.key === 'Tab') {
                e.preventDefault();
                setActiveInput('den');
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveInput('num');
                return;
            }
        }
        
        if (e.key.match(/^[0-9-]$/) || e.key === 'Backspace') {
            e.preventDefault();
            handleKeyPress(e.key);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
}, [handleNextQuestion, handleKeyPress, questions, currentQuestionIndex]);

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) return <div className="fixed inset-0 flex items-center justify-center">Generating questions...</div>;
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  return (
    <div className="fixed inset-0 bg-slate-100 dark:bg-slate-900 p-2 sm:p-4 flex flex-col z-50">
        <div className="flex-shrink-0">
            <div className="w-full flex justify-between items-center text-base sm:text-lg font-semibold">
                <span>Question: {currentQuestionIndex + 1} / {TOTAL_QUESTIONS}</span>
                <span className="text-red-500">{minutes}:{seconds < 10 ? `0${seconds}` : seconds}</span>
            </div>
            <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-1">
                <div className="h-1 bg-blue-500 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / TOTAL_QUESTIONS) * 100}%` }}></div>
            </div>
        </div>
        
        <div className="flex-grow flex flex-col landscape:flex-row items-center justify-center gap-4 py-2 overflow-hidden">
            <div className="w-full landscape:w-1/2 h-full flex items-center justify-center bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg">
                <div className="flex items-center justify-center gap-2 sm:gap-4 text-3xl sm:text-4xl">
                    <span className="font-mono tracking-wider">{`\\(${currentQuestion.text}\\)`}</span>
                    <span className="font-bold">=</span>
                    {currentQuestion.type === 'integer' ? (
                       <div 
                           onClick={() => setActiveInput('int')}
                           className={`w-24 sm:w-32 h-16 text-center text-3xl p-2 bg-slate-200 dark:bg-slate-700 rounded-md border-2 flex items-center justify-center cursor-text transition-colors ${activeInput === 'int' ? 'border-blue-500' : 'border-transparent'}`}
                           role="textbox"
                           aria-label="Integer answer"
                       >
                           <span className="truncate">{intAnswer}</span>
                           {activeInput === 'int' && <span className="animate-blink font-light ml-1">|</span>}
                       </div>
                    ) : (
                        <div className="inline-flex flex-col items-center">
                            <div 
                                onClick={() => setActiveInput('num')}
                                className={`w-20 sm:w-24 h-16 text-center text-3xl p-2 bg-slate-200 dark:bg-slate-700 rounded-md border-2 flex items-center justify-center cursor-text transition-colors ${activeInput === 'num' ? 'border-blue-500' : 'border-transparent'}`}
                                role="textbox"
                                aria-label="Numerator"
                            >
                                <span className="truncate">{numAnswer}</span>
                                {activeInput === 'num' && <span className="animate-blink font-light ml-1">|</span>}
                            </div>
                            <div className="w-24 sm:w-28 h-1 bg-slate-900 dark:bg-slate-200 my-2"></div>
                            <div 
                                onClick={() => setActiveInput('den')}
                                className={`w-20 sm:w-24 h-16 text-center text-3xl p-2 bg-slate-200 dark:bg-slate-700 rounded-md border-2 flex items-center justify-center cursor-text transition-colors ${activeInput === 'den' ? 'border-blue-500' : 'border-transparent'}`}
                                role="textbox"
                                aria-label="Denominator"
                            >
                                <span className="truncate">{denAnswer}</span>
                                {activeInput === 'den' && <span className="animate-blink font-light ml-1">|</span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full max-w-sm landscape:max-w-none landscape:w-1/2 h-full flex flex-col items-center justify-center gap-2 sm:gap-4">
              <div className="w-full max-w-[280px] sm:max-w-xs">
                 <NumberPad onKeyPress={handleKeyPress} />
              </div>
              <button onClick={handleNextQuestion} className="w-full max-w-[280px] sm:max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105">
                  {currentQuestionIndex >= TOTAL_QUESTIONS - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
        </div>
    </div>
  );
};


interface ResultsScreenProps {
  attempt: TestAttempt;
  studentHistory: TestAttempt[];
  onRestart: () => void;
}
const ResultsScreen: React.FC<ResultsScreenProps> = ({ attempt, studentHistory, onRestart }) => {
  const [summary, setSummary] = useState<string>('Analyzing...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getSummary = async () => {
      setIsLoading(true);
      if (studentHistory.reduce((acc, cv) => acc + cv.answeredQuestions.length, 0) < 10) {
        setSummary("Complete a few more tests to unlock detailed, long-term feedback and analysis from the tutor.");
        setIsLoading(false);
        return;
      }
      
      const result = await analyzeStudentHistory(studentHistory);
      setSummary(result);
      setIsLoading(false);
    };
    getSummary();
  }, [studentHistory]);

  const minutes = Math.floor(attempt.timeRemaining / 60);
  const seconds = attempt.timeRemaining % 60;

  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg text-center flex flex-col items-center">
      <h2 className="text-4xl font-bold text-green-500 mb-4">Test Complete!</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl my-6 text-lg">
        <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
          <p className="font-semibold">Correct Answers</p>
          <p className="text-3xl font-bold">{attempt.correctCount} / {TOTAL_QUESTIONS}</p>
        </div>
        <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
          <p className="font-semibold">Time Remaining</p>
          <p className="text-3xl font-bold">{minutes}:{seconds < 10 ? `0${seconds}` : seconds}</p>
        </div>
      </div>
      
      <div className="w-full max-w-2xl mt-4 text-left">
        <h3 className="text-2xl font-semibold mb-2">Teacher Feedback</h3>
        <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg min-h-[100px]">
          {isLoading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-3 py-1">
                <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded"></div>
                <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded"></div>
                <div className="h-2 bg-slate-300 dark:bg-slate-600 rounded"></div>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{summary}</p>
          )}
        </div>
      </div>
      
      <button
        onClick={onRestart}
        className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition-transform transform hover:scale-105"
      >
        Continue
      </button>
    </div>
  );
};