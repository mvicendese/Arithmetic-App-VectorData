export type QuestionType = 'integer' | 'rational';

export interface RationalNumber {
  num: number;
  den: number;
}

// --- NEW COMPLEXITY VECTOR TYPES based on user schema ---

type VectorOption<T extends string | number | boolean> = T | T[];


export type Skill = 
    | 'int_addition' 
    | 'int_subtraction' 
    | 'int_multiplication' 
    | 'int_division'
    | 'fraction_add_sub' // Simplified for generation
    | 'fraction_mul_div';

export interface QuestionVector {
    // Global
    sign_pattern?: VectorOption<'++' | '+-' | '-+' | '--'>;
    result_sign?: VectorOption<0 | 1 | -1>;
    magnitude_band?: VectorOption<'tiny' | 'small' | 'medium' | 'large'>;
    // Int Addition
    add_magnitude_band?: VectorOption<'tiny' | 'small' | 'medium' | 'large'>;
    add_digits_band?: VectorOption<'one_digit' | 'two_digits' | 'three_digits'>;
    add_carries_count_band?: VectorOption<'none' | 'single' | 'double' | 'triple_plus'>;
    add_has_cascade_carry?: VectorOption<boolean>;
    add_boundary_cross?: VectorOption<'none' | 'tens_only' | 'hundreds'>;
    // Int Subtraction
    sub_magnitude_band?: VectorOption<'tiny' | 'small' | 'medium' | 'large'>;
    sub_digits_band?: VectorOption<'one_digit' | 'two_digits' | 'three_digits'>;
    sub_borrows_count_band?: VectorOption<'none' | 'single' | 'double' | 'triple_plus'>;
    sub_has_cascade_borrow?: VectorOption<boolean>;
    sub_across_zero_column?: VectorOption<boolean>;
    sub_smaller_minus_larger?: VectorOption<boolean>;
    // Int Multiplication
    mul_factor_difficulty_band?: VectorOption<'easy' | 'medium' | 'hard' | 'very_hard'>;
    mul_any_factor_zero_or_one?: VectorOption<boolean>;
    mul_negative_structure?: VectorOption<'both_positive' | 'one_negative' | 'both_negative'>;
    mul_one_is_multiple_of_other?: VectorOption<boolean>;
    mul_product_is_square?: VectorOption<boolean>;
    // Int Division
    div_divisor_difficulty_band?: VectorOption<'easy' | 'medium' | 'hard' | 'very_hard'>;
    div_quotient_difficulty_band?: VectorOption<'easy' | 'medium' | 'hard' | 'very_hard'>;
    div_negative_structure?: VectorOption<'both_positive' | 'one_negative' | 'both_negative'>;
    div_quotient_is_square?: VectorOption<boolean>;
    // Fractions
    den_relationship_type?: VectorOption<'same' | 'one_divides_other' | 'share_factor' | 'coprime'>;
    // Contextual
    time_of_day?: VectorOption<'before_school' | 'period_1' | 'period_2' | 'period_3' | 'period_4' | 'after_school'>;
    question_number?: VectorOption<number>;
    time_into_test_band?: VectorOption<'0-10' | '10-40' | '40-70' | '70-100' | '100-120' | '120-140' | '150-160' | '160-170' | '170-180'>;
}

// Defines all possible options for the admin editor
export type QuestionVectorConfig = Record<string, (string | number | boolean)[]>;

// Defines the admin's settings for a single skill
// Maps a complexity score (1-100) to a target vector
export type ComplexityMapping = Record<number, Partial<QuestionVector>>;

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  answer: number | RationalNumber;
  operands: (number | RationalNumber)[];
  features: QuestionVector;
  skill: Skill;
  complexity: number;
}

export interface AnsweredQuestion {
  questionText: string;
  submittedAnswer: string;
  isCorrect: boolean;
  timeTakenSeconds: number;
  features: QuestionVector;
  operands: (number | RationalNumber)[];
  skill: Skill;
  complexity: number;
}

export interface TestAttempt {
  date: string;
  correctCount: number;
  timeRemaining: number;
  totalScore: number;
  answeredQuestions: AnsweredQuestion[];
}

export type SkillProfile = Record<Skill, number>;

export interface StudentData {
  skillProfile: SkillProfile;
  history: TestAttempt[];
}

// --- Multi-User System Types (Unchanged) ---
export type Role = 'admin' | 'teacher' | 'student';

export interface BaseUser {
  id: string;
  firstName: string;
  surname: string;
  password: string; // Plaintext for this simulation
  role: Role;
}

export interface AdminUser extends BaseUser {
  role: 'admin';
  email: string;
}

export interface TeacherUser extends BaseUser {
  role: 'teacher';
  email: string;
}

export interface StudentUser extends BaseUser {
  role: 'student';
  locked: boolean;
}

export type User = AdminUser | TeacherUser | StudentUser;

export interface Class {
  id: string;
  name: string;
  teacherIds: string[];
  studentIds: string[];
}

export interface Prompts {
    studentAnalysis: string;
    classAnalysis: string;
    schoolAnalysis: string;
}


export interface AppDatabase {
  users: User[];
  classes: Class[];
  studentProfiles: Record<string, StudentData>; // Keyed by studentId
  complexityConfig: Record<Skill, ComplexityMapping>;
  vectorConfig: QuestionVectorConfig;
  prompts: Prompts;
}