import { Question, RationalNumber, QuestionVector, Skill, ComplexityMapping } from '../types';
import { TOTAL_QUESTIONS } from '../constants';

// --- Math Helpers ---
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
const isSquare = (n: number): boolean => n > 0 && Math.sqrt(n) % 1 === 0;

const simplifyFraction = (rational: RationalNumber): RationalNumber => {
  if (rational.den === 0) throw new Error("Denominator cannot be zero.");
  if (rational.num === 0) return { num: 0, den: 1 };
  const commonDivisor = gcd(Math.abs(rational.num), Math.abs(rational.den));
  const num = rational.num / commonDivisor;
  const den = rational.den / commonDivisor;
  return den < 0 ? { num: -num, den: -den } : { num, den };
};

const getRandomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

// --- Feature Analysis Functions ---
const getSign = (n: number): 1 | -1 | 0 => (n > 0 ? 1 : n < 0 ? -1 : 0);

const getMagnitudeBand = (n: number): 'tiny' | 'small' | 'medium' | 'large' => {
    const absN = Math.abs(n);
    if (absN <= 10) return 'tiny';
    if (absN <= 50) return 'small';
    if (absN <= 200) return 'medium';
    return 'large';
};

const getDigitsBand = (n1: number, n2: number): 'one_digit' | 'two_digits' | 'three_digits' => {
    const maxDigits = Math.max(String(Math.abs(n1)).length, String(Math.abs(n2)).length);
    if (maxDigits === 1) return 'one_digit';
    if (maxDigits === 2) return 'two_digits';
    return 'three_digits';
};

const countCarries = (n1: number, n2: number): 'none' | 'single' | 'double' | 'triple_plus' => {
    if (n1 < 0 || n2 < 0) return 'none';
    let s1 = String(n1), s2 = String(n2);
    let carry = 0, carryCount = 0;
    let i = s1.length - 1, j = s2.length - 1;
    while (i >= 0 || j >= 0) {
        const d1 = i >= 0 ? parseInt(s1[i--]) : 0;
        const d2 = j >= 0 ? parseInt(s2[j--]) : 0;
        const sum = d1 + d2 + carry;
        if (sum >= 10) carryCount++;
        carry = Math.floor(sum / 10);
    }
    if (carry > 0) carryCount++;
    if (carryCount === 0) return 'none';
    if (carryCount === 1) return 'single';
    if (carryCount === 2) return 'double';
    return 'triple_plus';
};

const countBorrows = (n1: number, n2: number): 'none' | 'single' | 'double' | 'triple_plus' => {
    if (n1 < n2) return 'none';
    let s1 = String(n1), s2 = String(n2);
    let borrowCount = 0;
    const arr1 = s1.split('').map(Number);
    const arr2 = s2.padStart(s1.length, '0').split('').map(Number);
    for (let i = arr1.length - 1; i >= 0; i--) {
        if (arr1[i] < arr2[i]) {
            borrowCount++;
            let j = i - 1;
            while (j >= 0) {
                if (arr1[j] > 0) {
                    arr1[j]--;
                    break;
                }
                j--;
            }
        }
    }
    if (borrowCount === 0) return 'none';
    if (borrowCount === 1) return 'single';
    if (borrowCount === 2) return 'double';
    return 'triple_plus';
};

const hasCascadeCarry = (n1: number, n2: number): boolean => {
    if (n1 < 0 || n2 < 0) return false;
    let s1 = String(n1), s2 = String(n2);
    let carry = 0;
    let i = s1.length - 1, j = s2.length - 1;
    while (i >= 0 || j >= 0) {
        const d1 = i >= 0 ? parseInt(s1[i--]) : 0;
        const d2 = j >= 0 ? parseInt(s2[j--]) : 0;
        const sum = d1 + d2 + carry;
        if (d1 === 9 || d2 === 9 || (d1 + d2 === 9 && carry > 0)) {
            if (sum >= 10) return true;
        }
        carry = Math.floor(sum / 10);
    }
    return false;
};

const getDenominatorRelationship = (den1: number, den2: number): 'same' | 'one_divides_other' | 'share_factor' | 'coprime' => {
    if (den1 === den2) return 'same';
    if (den1 % den2 === 0 || den2 % den1 === 0) return 'one_divides_other';
    if (gcd(den1, den2) > 1) return 'share_factor';
    return 'coprime';
};


const analyzeIntAddition = (n1: number, n2: number): Partial<QuestionVector> => {
    const answer = n1 + n2;
    return {
        sign_pattern: `${getSign(n1) >= 0 ? '+' : '-'}${getSign(n2) >= 0 ? '+' : '-'}` as any,
        result_sign: getSign(answer),
        magnitude_band: getMagnitudeBand(answer),
        add_magnitude_band: getMagnitudeBand(Math.max(Math.abs(n1), Math.abs(n2))),
        add_digits_band: getDigitsBand(n1, n2),
        add_carries_count_band: countCarries(n1, n2),
        add_has_cascade_carry: hasCascadeCarry(n1, n2),
    };
};

const analyzeIntSubtraction = (n1: number, n2: number): Partial<QuestionVector> => {
    const answer = n1 - n2;
    return {
        sign_pattern: `${getSign(n1) >= 0 ? '+' : '-'}${getSign(n2) >= 0 ? '+' : '-'}` as any,
        result_sign: getSign(answer),
        magnitude_band: getMagnitudeBand(answer),
        sub_magnitude_band: getMagnitudeBand(Math.max(Math.abs(n1), Math.abs(n2))),
        sub_digits_band: getDigitsBand(n1, n2),
        sub_borrows_count_band: countBorrows(n1, n2),
        sub_smaller_minus_larger: Math.abs(n1) < Math.abs(n2),
        sub_across_zero_column: String(n1).includes('0') && n1 > n2,
    };
};

const getNumberDifficulty = (n: number): 'easy' | 'medium' | 'hard' | 'very_hard' => {
    const absN = Math.abs(n);
    if (absN <= 1) return 'easy';
    if ([2, 10, 5].includes(absN)) return 'easy';
    if ([9, 3, 4, 6, 8].includes(absN)) return 'medium';
    if ([11, 7, 12, 20].includes(absN)) return 'hard';
    return 'very_hard';
}

const analyzeIntMultiplication = (n1: number, n2: number): Partial<QuestionVector> => {
    const product = n1 * n2;
    let negative_structure: QuestionVector['mul_negative_structure'] = 'both_positive';
    if (n1 < 0 && n2 < 0) negative_structure = 'both_negative';
    else if (n1 < 0 || n2 < 0) negative_structure = 'one_negative';

    const maxFactorDifficulty = getNumberDifficulty(Math.max(Math.abs(n1), Math.abs(n2)));

    return {
        mul_factor_difficulty_band: maxFactorDifficulty,
        mul_any_factor_zero_or_one: Math.abs(n1) <= 1 || Math.abs(n2) <= 1,
        mul_negative_structure: negative_structure,
        mul_one_is_multiple_of_other: n1 !== 0 && n2 !== 0 ? (n1 % n2 === 0 || n2 % n1 === 0) : false,
        mul_product_is_square: isSquare(product),
        result_sign: getSign(product),
    };
};

const analyzeIntDivision = (n1: number, n2: number): Partial<QuestionVector> => {
    const quotient = n1 / n2;
    let negative_structure: QuestionVector['div_negative_structure'] = 'both_positive';
    if (n1 < 0 && n2 < 0) negative_structure = 'both_negative';
    else if (n1 < 0 || n2 < 0) negative_structure = 'one_negative';

    return {
        div_divisor_difficulty_band: getNumberDifficulty(n2),
        div_quotient_difficulty_band: getNumberDifficulty(quotient),
        div_negative_structure: negative_structure,
        div_quotient_is_square: isSquare(quotient),
        result_sign: getSign(quotient),
    };
};

const analyzeFractionAddSub = (r1: RationalNumber, r2: RationalNumber): Partial<QuestionVector> => ({
    den_relationship_type: getDenominatorRelationship(r1.den, r2.den)
});
const analyzeFractionMulDiv = (r1: RationalNumber, r2: RationalNumber): Partial<QuestionVector> => ({
    den_relationship_type: getDenominatorRelationship(r1.den, r2.den) // Simplified
});


// --- Generate and Test Engine ---

const doesVectorMatch = (generated: Partial<QuestionVector>, target: Partial<QuestionVector>): boolean => {
    for (const key in target) {
        const targetValue = target[key as keyof QuestionVector];
        const generatedValue = generated[key as keyof QuestionVector];
        if (Array.isArray(targetValue)) {
            // FIX: Cast targetValue to any[] to resolve issue with .includes on a union of array types.
            if (!(targetValue as any[]).includes(generatedValue)) return false;
        } else {
            if (generatedValue !== targetValue) return false;
        }
    }
    return true;
};

const generateAndTest = (
    skill: Skill,
    targetVector: Partial<QuestionVector>,
    complexity: number
): Omit<Question, 'id'> => {
    let attempts = 0;
    while (attempts < 500) { // Safety break
        attempts++;
        let questionData: Omit<Question, 'id' | 'complexity'> | null = null;
        
        // 1. Generate Random Operands
        const n1 = getRandomInt(-100, 100);
        let n2 = getRandomInt(-100, 100);
        while(n2 === 0 && (skill === 'int_division' || skill === 'fraction_mul_div')) {
          n2 = getRandomInt(-100, 100);
        }

        // 2. Generate Question and Analyze its Vector
        switch (skill) {
            case 'int_addition':
                questionData = {
                    text: `${n1} + ${n2}`, type: 'integer', answer: n1 + n2, operands: [n1, n2],
                    features: analyzeIntAddition(n1, n2), skill,
                };
                break;
            case 'int_subtraction':
                questionData = {
                    text: `${n1} - ${n2}`, type: 'integer', answer: n1 - n2, operands: [n1, n2],
                    features: analyzeIntSubtraction(n1, n2), skill,
                };
                break;
            case 'int_multiplication':
                const m1 = getRandomInt(-25, 25);
                const m2 = getRandomInt(-25, 25);
                questionData = {
                    text: `${m1} \\times ${m2}`, type: 'integer', answer: m1 * m2, operands: [m1, m2],
                    features: analyzeIntMultiplication(m1, m2), skill,
                };
                break;
            case 'int_division':
                const d2_options = [-25, -24, -22, -21, -20, -18, -16, -15, -14, -13, -12, -11, -9, -8, -7, -6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 18, 20, 21, 22, 24, 25];
                const d2 = d2_options[getRandomInt(0, d2_options.length - 1)];
                const d_ans = getRandomInt(-12, 12);
                const d1 = d2 * d_ans;
                 questionData = {
                    text: `${d1} \\div ${d2}`, type: 'integer', answer: d_ans, operands: [d1, d2],
                    features: analyzeIntDivision(d1, d2), skill,
                };
                break;
            case 'fraction_add_sub':
                const fr_n1 = getRandomInt(1,10), fr_d1 = getRandomInt(fr_n1, 12);
                const fr_n2 = getRandomInt(1,10), fr_d2 = getRandomInt(fr_n2, 12);
                const r1 = {num: fr_n1, den: fr_d1};
                const r2 = {num: fr_n2, den: fr_d2};
                const op = Math.random() > 0.5 ? '+' : '-';
                const resultNum = op === '+' ? r1.num * r2.den + r2.num * r1.den : r1.num * r2.den - r2.num * r1.den;
                const resultDen = r1.den * r2.den;
                 questionData = {
                    text: `\\frac{${r1.num}}{${r1.den}} ${op} \\frac{${r2.num}}{${r2.den}}`, type: 'rational',
                    answer: simplifyFraction({num: resultNum, den: resultDen}), operands: [r1, r2],
                    features: analyzeFractionAddSub(r1, r2), skill
                };
                break;
            case 'fraction_mul_div':
                const fm_n1 = getRandomInt(1,10), fm_d1 = getRandomInt(fm_n1, 12);
                const fm_n2 = getRandomInt(1,10), fm_d2 = getRandomInt(fm_n2, 12);
                const rm1 = {num: fm_n1, den: fm_d1};
                const rm2 = {num: fm_n2, den: fm_d2};
                const opm = Math.random() > 0.5 ? '\\times' : '\\div';
                const resultNumM = opm === '\\times' ? rm1.num * rm2.num : rm1.num * rm2.den;
                const resultDenM = opm === '\\times' ? rm1.den * rm2.den : rm1.den * rm2.num;
                 questionData = {
                    text: `\\frac{${rm1.num}}{${rm1.den}} ${opm} \\frac{${rm2.num}}{${rm2.den}}`, type: 'rational',
                    answer: simplifyFraction({num: resultNumM, den: resultDenM}), operands: [rm1, rm2],
                    features: analyzeFractionMulDiv(rm1, rm2), skill
                };
                break;
        }

        // 3. Compare vectors
        if (questionData && doesVectorMatch(questionData.features, targetVector)) {
            return { ...questionData, complexity };
        }
    }
    
    // Fallback if no matching question is found
    console.warn(`Could not generate a matching question for ${skill} at complexity ${complexity}. Returning a random one.`);
    return generateAndTest(skill, {}, complexity); // Generate with no constraints
};

const getTargetVectorForComplexity = (complexity: number, mapping: ComplexityMapping): Partial<QuestionVector> => {
    const applicableLevels = Object.keys(mapping)
        .map(Number)
        .filter(level => level <= complexity)
        .sort((a, b) => a - b); // Sort from lowest to highest

    if (applicableLevels.length === 0) {
        return {};
    }

    // Merge the vectors, with higher levels overwriting lower ones.
    const finalVector = applicableLevels.reduce((acc, level) => {
        return { ...acc, ...mapping[level] };
    }, {});
    
    return finalVector;
}


export const generateTestQuestions = (
    skillProfile: Record<Skill, number>,
    complexityConfig: Record<Skill, ComplexityMapping>
): Question[] => {
    const questions: Question[] = [];
    
    const questionDistribution: Skill[] = [
        ...Array(5).fill('int_addition'),
        ...Array(5).fill('int_subtraction'),
        ...Array(5).fill('int_multiplication'),
        ...Array(5).fill('int_division'),
        ...Array(3).fill('fraction_add_sub'),
        ...Array(2).fill('fraction_mul_div'),
    ];
    // Shuffle distribution for variety
    for (let i = questionDistribution.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionDistribution[i], questionDistribution[j]] = [questionDistribution[j], questionDistribution[i]];
    }

    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
        const skill = questionDistribution[i];
        const complexity = skillProfile[skill];
        const configForSkill = complexityConfig[skill];
        const targetVector = getTargetVectorForComplexity(complexity, configForSkill);

        const questionData = generateAndTest(skill, targetVector, complexity);
        questions.push({ id: crypto.randomUUID(), ...questionData });
    }

    return questions;
};