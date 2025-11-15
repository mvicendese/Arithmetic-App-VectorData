import { GoogleGenAI } from "@google/genai";
import { StudentData, TestAttempt, RationalNumber, AnsweredQuestion, SkillProfile } from '../types';
import * as api from './mockService';

declare const process: { env: { API_KEY?: string } };

const formatFeaturesForPrompt = (q: AnsweredQuestion): string => {
    const { features, timeTakenSeconds, isCorrect } = q;
    // We send the whole feature vector now
    return `- Correct: ${isCorrect}, Time: ${timeTakenSeconds}s, Skill: ${q.skill}, Complexity: ${q.complexity}, Features: ${JSON.stringify(features)}`;
}

export async function analyzeStudentHistory(history: TestAttempt[]): Promise<string> {
  if (!process.env.API_KEY) {
    return "Gemini API Key is not configured. Please ensure API_KEY is set in your environment variables.";
  }
  if (history.length === 0) {
    return "No history to analyze.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const formattedHistory = history.map((attempt, index) => {
    const questionsSummary = attempt.answeredQuestions.map(formatFeaturesForPrompt).join('\n');
    return `Test ${index + 1}:\n${questionsSummary}`;
  }).join('\n\n');

  try {
    const prompts = await api.getPrompts();
    const finalPrompt = `${prompts.studentAnalysis}\n\nHere is the student's test history:\n${formattedHistory}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: finalPrompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "There was an error analyzing the student's history. Please try again later.";
  }
}

export async function analyzeClassForGroupings(
  classStudentsData: { studentName: string; data: StudentData }[]
): Promise<string> {
  if (!process.env.API_KEY) {
    return "Gemini API Key is not configured. Could not analyze class trends.";
  }
  if (classStudentsData.length === 0) {
    return "There are no students in this class to analyze.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const formattedData = classStudentsData
    .map(student => {
        if (!student.data || !student.data.skillProfile) {
            return `Student: ${student.studentName}\n  - No profile data yet.`;
        }
        
        const skillsSummary = Object.entries(student.data.skillProfile)
            .map(([skill, score]) => `    - ${skill}: ${score.toFixed(0)}`)
            .join('\n');

        return `Student: ${student.studentName}\n  - Skill Complexity Scores:\n${skillsSummary}`;
    })
    .join('\n\n');

  try {
    const prompts = await api.getPrompts();
    const finalPrompt = `${prompts.classAnalysis}\n\nHere is the skill profile data for the class:\n${formattedData}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: finalPrompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "There was an error analyzing class trends. Please try again later.";
  }
}

export async function analyzeSchoolTrends(
  allStudentsData: { studentName: string; data: StudentData }[]
): Promise<string> {
  if (!process.env.API_KEY) {
    return "Gemini API Key is not configured. Could not analyze school trends.";
  }
  if (allStudentsData.length === 0) {
    return "There are no students in the school to analyze.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const formattedData = allStudentsData
    .map(student => {
      if (!student.data || !student.data.skillProfile) return null;
      const avgScore = Object.values(student.data.skillProfile).reduce((a, b) => a + b, 0) / Object.keys(student.data.skillProfile).length;
      return ` - ${student.studentName}: Avg Skill Score ${avgScore.toFixed(0)}`;
    })
    .filter(Boolean)
    .join('\n');
    
  try {
    const prompts = await api.getPrompts();
    const finalPrompt = `${prompts.schoolAnalysis}\n\nHere is the list of all students and their average skill complexity scores:\n${formattedData}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: finalPrompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "There was an error analyzing school trends. Please try again later.";
  }
}
