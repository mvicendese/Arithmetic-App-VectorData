import { AppDatabase, User, Class, StudentUser, StudentData, TestAttempt, Prompts, AnsweredQuestion, Skill, ComplexityMapping, QuestionVectorConfig, SkillProfile } from '../types';
import { TOTAL_QUESTIONS } from '../constants';

// --- INITIAL PROMPTS for the new Vector Model ---
const INITIAL_PROMPTS: Prompts = {
    studentAnalysis: `
    You are an expert data analyst and math tutor. You will be given the complete test history for a student. Your task is to provide a detailed, insightful, and actionable summary for a teacher.

    The data for each question is now a highly structured "vector" of its mathematical properties. Analyze these vectors to find deep patterns.

    - \`skill\`: The specific skill being tested (e.g., 'int_subtraction').
    - \`complexity\`: The target complexity score for the question (1-100).
    - \`isCorrect\`: boolean
    - \`timeTakenSeconds\`: number
    - \`features\`: A rich object of features like:
        - \`sub_borrows_count_band\`: ('none', 'single', 'double')
        - \`add_carries_count_band\`: ('none', 'single', 'double')
        - \`den_relationship_type\`: ('same', 'coprime', etc. for fractions)
        - \`time_of_day\`: ('period_1', 'after_school', etc.)
        - \`time_into_test_band\`: ('0-10s', '40-70s', etc.)

    Based on the ENTIRE history, provide a deep analysis. Use markdown for clear formatting.

    1.  **Overall Summary:** A brief, high-level overview of the student's progress, strengths, and primary areas for improvement across all skills.

    2.  **Deep-Dive by Skill:** For each skill (e.g., Integer Subtraction, Fraction Addition), analyze their performance against the feature vectors.
        *   **Identify Specific Procedural Gaps:** Be extremely specific. Don't just say "they are bad at subtraction." Say: "The student's accuracy in 'int_subtraction' drops from 95% to 30% when the feature 'sub_borrows_count_band' is 'single' or 'double'. This indicates a clear difficulty with the borrowing/regrouping procedure."
        *   **Find Hidden Correlations:** Look for patterns. "For fraction problems, they are highly accurate when 'den_relationship_type' is 'same' or 'one_divides_other', but accuracy plummets when it is 'coprime', suggesting they struggle with finding a common denominator for unrelated numbers."

    3.  **Contextual & Performance Analysis:**
        *   **Focus & Stamina:** Analyze performance vs. \`time_into_test_band\`. Does accuracy drop significantly in the '120-140' or later bands? This could indicate fatigue.
        *   **Time of Day:** Is there any correlation between performance and \`time_of_day\`? Mention if there's a noticeable pattern.

    Synthesize these points into a comprehensive report. Be a detective. Use the vector data to back up every claim and provide concrete, actionable recommendations.
  `,
    classAnalysis: `
    You are an expert educational analyst. You are given data on the skill profiles of students in a class. Each student has a complexity score (1-100+) for various arithmetic skills. Your task is to identify common weaknesses and group students to help a teacher form small support groups.

    Based on the provided skill profiles:
    1.  **Identify Common Weakness Themes:** Look for skills where multiple students have low complexity scores (e.g., below 30). These are your key intervention areas.
    2.  **Group Students:** List the identified themes as clear, bolded markdown headers (e.g., **Needs Foundational Support in Integer Subtraction**). Under each header, list the names of the students who have low scores in that specific skill. A student can appear in multiple groups.
    3.  **Provide Actionable Advice:** For each group, give a brief, concrete suggestion for a small group activity. For example, for the subtraction group, "Focus on hands-on activities with base-ten blocks to physically demonstrate the concept of borrowing/regrouping."
    4.  **Acknowledge Strong Students:** Identify students who have consistently high scores across most skills. They could be candidates for enrichment or peer tutoring.

    Your output should be well-formatted using markdown.
  `,
    schoolAnalysis: `
    You are an expert data analyst for a school administrator. You are given the average skill complexity scores for all students. Your task is to provide a high-level executive summary.

    Based on the provided list of student scores:
    1.  **Overall Distribution:** Briefly describe the distribution of students. Are most students in the foundational (avg score < 30), developing (30-60), or proficient (60+) range?
    2.  **Identify At-Risk Cohorts:** Identify any significant groups of students who are clustered at low average scores.
    3.  **Identify High-Achievers:** Acknowledge the group of students who are progressing to high average scores.
    4.  **Actionable Recommendations:** Suggest broad, school-level interventions. For example: "A significant number of students have an average skill score below 30. This may indicate a need for a school-wide review of foundational math instruction in earlier grades."

    Be concise, use markdown, and focus on the big picture.
  `
};

const VECTOR_CONFIG: QuestionVectorConfig = {
    "sign_pattern": ["++", "+-", "-+", "--"],
    "result_sign": [0, 1, -1],
    "magnitude_band": ["tiny", "small", "medium", "large"],
    "add_magnitude_band": ["tiny", "small", "medium", "large"],
    "add_digits_band": ["one_digit", "two_digits", "three_digits"],
    "add_carries_count_band": ["none", "single", "double", "triple_plus"],
    "add_has_cascade_carry": [false, true],
    "sub_magnitude_band": ["tiny", "small", "medium", "large"],
    "sub_digits_band": ["one_digit", "two_digits", "three_digits"],
    "sub_borrows_count_band": ["none", "single", "double", "triple_plus"],
    "sub_has_cascade_borrow": [false, true],
    "sub_across_zero_column": [false, true],
    "sub_smaller_minus_larger": [false, true],
    "mul_factor_difficulty_band": ['easy', 'medium', 'hard', 'very_hard'],
    "mul_any_factor_zero_or_one": [false, true],
    "mul_negative_structure": ["both_positive", "one_negative", "both_negative"],
    "mul_one_is_multiple_of_other": [false, true],
    "mul_product_is_square": [false, true],
    "div_divisor_difficulty_band": ['easy', 'medium', 'hard', 'very_hard'],
    "div_quotient_difficulty_band": ['easy', 'medium', 'hard', 'very_hard'],
    "div_negative_structure": ["both_positive", "one_negative", "both_negative"],
    "div_quotient_is_square": [false, true],
    "den_relationship_type": ["same", "one_divides_other", "share_factor", "coprime"],
};


// --- IN-MEMORY DATABASE ---
const db: AppDatabase = {
  users: [],
  classes: [],
  studentProfiles: {},
  complexityConfig: {} as Record<Skill, ComplexityMapping>,
  vectorConfig: VECTOR_CONFIG,
  prompts: INITIAL_PROMPTS,
};

// --- DATA SEEDING ---
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const seedDatabase = () => {
    // Clear existing data
    db.users = [];
    db.classes = [];
    db.studentProfiles = {};
    db.prompts = INITIAL_PROMPTS;
    db.vectorConfig = VECTOR_CONFIG;

    // Default complexity config
    db.complexityConfig = {
        int_addition: {
            1: { add_digits_band: 'one_digit', add_carries_count_band: 'none', sign_pattern: '++' },
            20: { add_digits_band: 'two_digits', add_carries_count_band: 'none' },
            40: { add_carries_count_band: 'single' },
            60: { sign_pattern: ['+-', '-+'] },
        },
        int_subtraction: {
            1: { sub_digits_band: 'one_digit', sub_borrows_count_band: 'none', sign_pattern: '++' },
            25: { sub_digits_band: 'two_digits' },
            35: { sub_borrows_count_band: 'single' },
            50: { sub_across_zero_column: true },
            65: { sub_smaller_minus_larger: true }
        },
        int_multiplication: { 
            1: { mul_any_factor_zero_or_one: true }, 
            20: { mul_any_factor_zero_or_one: false, mul_factor_difficulty_band: 'easy' }, 
            40: { mul_factor_difficulty_band: ['easy', 'medium'] },
            60: { mul_factor_difficulty_band: ['medium', 'hard'], mul_negative_structure: ['one_negative', 'both_negative'] }
        },
        int_division: { 
            1: { div_divisor_difficulty_band: 'easy' }, 
            30: { div_divisor_difficulty_band: 'medium'}, 
            60: { div_divisor_difficulty_band: ['hard', 'very_hard']} 
        },
        fraction_add_sub: { 
            1: { den_relationship_type: 'same' }, 
            30: { den_relationship_type: 'one_divides_other'},
            60: { den_relationship_type: ['share_factor', 'coprime']}
        },
        fraction_mul_div: { 1: {}, 30: {}, 60: {} },
    };

    db.users.push({ id: 'admin-1', role: 'admin', firstName: 'Admin', surname: 'User', email: 'admin@sprint.com', password: 'admin' });

    const teacherChars = ['A', 'B', 'C'];
    teacherChars.forEach(teacherChar => {
        const teacherId = `teacher-${teacherChar}`;
        db.users.push({
            id: teacherId, role: 'teacher', firstName: `Teach${teacherChar}`, surname: 'User',
            email: `teach${teacherChar}@sprint.com`, password: 'password'
        });
        const classId = `class-${teacherChar}a`;
        db.classes.push({ id: classId, name: `Class ${teacherChar}a`, teacherIds: [teacherId], studentIds: [] });
    });

    // Create a smaller, more focused set of students for clarity
    for (let i = 1; i <= 15; i++) {
        const studentId = `student-Aa${i}`;
        db.users.push({
            id: studentId, role: 'student', firstName: `Student`, surname: `Aa${i}`,
            password: 'password', locked: false
        });
        db.classes[0].studentIds.push(studentId);

        // Create student profile
        const startingProfile: SkillProfile = {
            int_addition: 5, int_subtraction: 5, int_multiplication: 5, int_division: 5,
            fraction_add_sub: 5, fraction_mul_div: 5,
        };

        // Simulate a few test histories to create varied profiles
        let currentProfile = {...startingProfile};
        const history: TestAttempt[] = [];
        const numTests = getRandomInt(5, 10);
        for(let t=0; t<numTests; t++) {
             const answeredQuestions: AnsweredQuestion[] = [];
             Object.keys(currentProfile).forEach(key => {
                 const skill = key as Skill;
                 const isCorrect = Math.random() < 0.8; // 80% chance of getting it right to simulate progress
                 if(isCorrect) currentProfile[skill] += getRandomInt(3, 6);
                 else currentProfile[skill] = Math.max(5, currentProfile[skill] - 2);
                 
                 answeredQuestions.push({
                     questionText: `Simulated`, submittedAnswer: 'sim', isCorrect, timeTakenSeconds: 5,
                     features: {}, operands: [], skill, complexity: currentProfile[skill]
                 });
             });
             history.push({ date: new Date().toISOString(), correctCount: answeredQuestions.filter(a=>a.isCorrect).length, timeRemaining: 100, totalScore: 0, answeredQuestions });
        }
        
        db.studentProfiles[studentId] = {
            skillProfile: currentProfile,
            history: history,
        };
    }
};

seedDatabase();


const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- COMPLEXITY & PROMPT APIs ---
export const getComplexityConfig = async (): Promise<Record<Skill, ComplexityMapping>> => {
    await delay(50);
    return JSON.parse(JSON.stringify(db.complexityConfig));
};
export const getVectorConfig = async (): Promise<QuestionVectorConfig> => {
    await delay(50);
    return JSON.parse(JSON.stringify(db.vectorConfig));
};
export const updateComplexityConfig = async (newConfig: Record<Skill, ComplexityMapping>): Promise<void> => {
    await delay(200);
    db.complexityConfig = { ...newConfig };
};

export const getPrompts = async (): Promise<Prompts> => {
    await delay(50);
    return JSON.parse(JSON.stringify(db.prompts));
}
export const updatePrompts = async (newPrompts: Prompts): Promise<void> => {
    await delay(200);
    db.prompts = { ...newPrompts };
}


// --- AUTHENTICATION API ---
export const login = async (usernameOrEmail: string, password: string): Promise<{ user: User | null; error?: string }> => {
  await delay(300);
  const trimmedUsernameOrEmail = usernameOrEmail.trim().toLowerCase();
  
  const user = db.users.find(u => {
    if ((u.role === 'admin' || u.role === 'teacher') && 'email' in u) {
      return u.email.toLowerCase() === trimmedUsernameOrEmail;
    }
    if (u.role === 'student') {
      const studentUsername = `student.${u.surname.toLowerCase()}`;
      const normalizedInput = trimmedUsernameOrEmail.replace(/\s/g, '.');
      return studentUsername === normalizedInput;
    }
    return false;
  });

  if (user && user.password === password.trim()) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    return { user };
  }
  return { user: null, error: 'Invalid credentials. For students, username is student.<surname> (e.g., student.aa1)' };
};

export const logout = (): void => {
  sessionStorage.removeItem('currentUser');
};

export const getCurrentUser = (): User | null => {
  try {
    const userJson = sessionStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error("Failed to parse user from sessionStorage", error);
    sessionStorage.removeItem('currentUser');
    return null;
  }
};

// --- USER MANAGEMENT API ---
export const getUsers = async (): Promise<User[]> => {
  await delay(100);
  return [...db.users];
};

export const createUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  await delay(200);
  const rolePrefix = userData.role;
  const docId = `${rolePrefix}-${crypto.randomUUID().slice(0, 8)}`; 
  
  const newUser: User = { ...userData, id: docId } as User;
  db.users.push(newUser);

  if (newUser.role === 'student') {
    db.studentProfiles[newUser.id] = {
      skillProfile: {
          int_addition: 5, int_subtraction: 5, int_multiplication: 5, int_division: 5,
          fraction_add_sub: 5, fraction_mul_div: 5
      },
      history: [],
    };
  }

  return newUser;
};

export const updateUser = async (userId: string, updates: Partial<StudentUser>): Promise<User> => {
  await delay(100);
  const userIndex = db.users.findIndex(u => u.id === userId);
  if (userIndex === -1) throw new Error("User not found");
  // FIX: Cast the result of the spread to User, as TypeScript cannot verify
  // that the combination of a generic User and a Partial<StudentUser> is a valid User.
  db.users[userIndex] = { ...db.users[userIndex], ...updates } as User;
  return db.users[userIndex];
};

export const createStudentAndAddToClass = async (
    studentData: Omit<StudentUser, 'id' | 'role' | 'locked'>,
    classId: string
): Promise<{ newUser: StudentUser, updatedClass: Class }> => {
  const studentPayload: Omit<StudentUser, 'id'> = {
      ...studentData, role: 'student', locked: false,
  };
  const newUser = await createUser(studentPayload) as StudentUser;
  const updatedClass = await addStudentToClass(classId, newUser.id);
  return { newUser, updatedClass };
};

// --- CLASS MANAGEMENT API ---
export const getAllClasses = async (): Promise<Class[]> => {
  await delay(100);
  return [...db.classes];
};

export const getClassesForTeacher = async (teacherId: string): Promise<Class[]> => {
  await delay(100);
  return db.classes.filter((c: Class) => Array.isArray(c.teacherIds) && c.teacherIds.includes(teacherId));
};

export const createClass = async (name: string, teacherId: string): Promise<Class> => {
  await delay(200);
  const id = `class-${crypto.randomUUID().slice(0, 8)}`;
  const newClass: Class = {
      id, name, teacherIds: [teacherId], studentIds: [],
  };
  db.classes.push(newClass);
  return newClass;
};

export const addStudentToClass = async (classId: string, studentId: string): Promise<Class> => {
  await delay(100);
  const classIndex = db.classes.findIndex(c => c.id === classId);
  if (classIndex === -1) throw new Error("Class not found");
  
  const studentIds = db.classes[classIndex].studentIds;
  if (!studentIds.includes(studentId)) {
      studentIds.push(studentId);
  }
  return db.classes[classIndex];
};

// --- STUDENT DATA API ---
export const getStudentProfile = async (studentId: string): Promise<StudentData> => {
  await delay(50);
  if (db.studentProfiles[studentId]) {
    return JSON.parse(JSON.stringify(db.studentProfiles[studentId]));
  }
  const defaultProfile: StudentData = {
    skillProfile: {
        int_addition: 5, int_subtraction: 5, int_multiplication: 5, int_division: 5,
        fraction_add_sub: 5, fraction_mul_div: 5
    },
    history: [],
  };
  db.studentProfiles[studentId] = defaultProfile;
  return defaultProfile;
};

export const updateStudentProfileAfterTest = async (studentId: string, attempt: TestAttempt): Promise<StudentData> => {
  await delay(100);
  const studentData = await getStudentProfile(studentId);
  const newSkillProfile = { ...studentData.skillProfile };

  attempt.answeredQuestions.forEach(q => {
    const skill = q.skill;
    if (q.isCorrect) {
        newSkillProfile[skill] = Math.min(100, newSkillProfile[skill] + (q.timeTakenSeconds < 8 ? 5 : 3));
    } else {
        newSkillProfile[skill] = Math.max(5, newSkillProfile[skill] - 2);
    }
  });

  const newStudentData: StudentData = {
    skillProfile: newSkillProfile,
    history: [...studentData.history, attempt],
  };

  db.studentProfiles[studentId] = newStudentData;
  return newStudentData;
};