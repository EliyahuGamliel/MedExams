const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("firebase-functions/logger");

const apiKey = defineSecret("GEMINI_API_KEY");

exports.processExamWithGemini = onCall(
  {
    cors: true,
    timeoutSeconds: 540,
    memory: "2GiB",
    secrets: [apiKey],
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "רק משתמש מחובר רשאי לבצע פעולה זו.");
    }

    const { fileBase64, parsingMode } = request.data;

    if (!fileBase64) {
      throw new HttpsError("invalid-argument", "לא נשלח קובץ.");
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey.value());
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      // בחירת הפרומפט המדויק
       let prompt;

      if (parsingMode === 'standard') {
        // --- מצב רגיל (טופס 0) ---
        prompt = `Extract questions from this exam PDF to JSON. 
        The first option is ALWAYS correct (Form 0 style).
        CRITICAL FOR IMAGES: Set "imageNeeded": true ONLY IF text explicitly refers to a missing diagram/graph.
        Return ONLY raw JSON array: [{"id": 1, "text": "Q", "options": ["Correct", "W1", "W2"], "correctIndex": 0, "imageNeeded": false}]`;
      } else {
        // --- מצב ממוחשב (Moodle) - הפרומפט החדש והגמיש ---
        prompt = `You are parsing a "Review" PDF of a solved Moodle exam.
        Extract questions into a JSON array. 
        
        The exam contains two main types of logical questions. Use your intelligence to detect the type:

        TYPE 1: Single Choice (Radio Buttons / Checkboxes)
        - The user selects ONE answer from a list.
        - The correct answer is marked with "התשובה הנכונה:", a checkmark (✓/☑), or bold text.
        - Output format: {"type": "multiple_choice", "text": "Question?", "options": ["Opt1", "Opt2"], "correctIndex": X, "imageNeeded": false}

        TYPE 2: Complex / Multi-Part / Matching / Cloze
        - DETECT IF: The question asks to match items, fill multiple blanks, or classify items.
        - EXAMPLES: 
          * "Match item A to X, item B to Y..."
          * "Complete the sentence: The heart is {{0}} and the liver is {{1}}..."
          * A list of sub-questions (1, 2, 3...) where each has its own correct answer displayed.
        
        - ACTION for Type 2:
          1. Consolidate the main question text and the sub-items into one clear string.
          2. Identify the CORRECT answer for EACH sub-item/blank.
          3. Replace the correct answers in the text with {{0}}, {{1}}, {{2}}...
          4. Create a "clozeOptions" array. For each blank/item:
             - Put the correct answer as the first option.
             - GENERATE 3 plausible distractors (wrong answers) relevant to that specific item.
        
        - Output format for Type 2:
          {
            "type": "cloze", 
            "text": "Match the following:\nLung Pattern A: {{0}}\nLung Pattern B: {{1}}", 
            "clozeOptions": [
               {"options": ["Alveolar", "Interstitial", "Normal", "Cystic"], "correctIndex": 0},
               {"options": ["Interstitial", "Alveolar", "Normal", "Cystic"], "correctIndex": 0}
            ],
            "imageNeeded": true 
          }

        CRITICAL RULES:
        1. If a question refers to an image (X-ray, Graph, Diagram) -> Set "imageNeeded": true.
        2. If you see a text box inside a sentence -> It is a Type 2 (Cloze) question.
        3. If there are multiple correct answers for different parts of the question -> It is a Type 2 (Cloze) question.

        Return ONLY the raw JSON array.`;
      }
      

      // 1. קבלת התשובה הגולמית מ-Gemini
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: fileBase64, mimeType: "application/pdf" } },
      ]);

      const responseText = result.response.text();
      
      // 2. פונקציית עזר לניקוי חכם של JSON
      // היא מחפשת את הסוגריים המרובעים החיצוניים ביותר ומנקה שאריות
      function extractJSON(text) {
        // הסרת בלוקים של מרקדאון אם יש (```json ... ```)
        let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');
        
        if (firstBracket === -1 || lastBracket === -1) {
             throw new Error("לא נמצא מבנה של מערך JSON בתשובה.");
        }

        // ניסיון ראשון: חיתוך מהסוגר הראשון לאחרון
        const candidate = cleanText.substring(firstBracket, lastBracket + 1);
        
        try {
            return JSON.parse(candidate);
        } catch (e) {
            // אם נכשלנו, כנראה ש-Gemini הוסיף הערות עם סוגריים בסוף הטקסט.
            // ננסה לנקות את ה"זנב" עד שנצליח (לולאה מהסוף להתחלה)
            // זה מנגנון "הצלה" למקרים קשים
            let currentEnd = lastBracket;
            while (currentEnd > firstBracket) {
                try {
                    const subCandidate = cleanText.substring(firstBracket, currentEnd + 1);
                    return JSON.parse(subCandidate);
                } catch (e2) {
                    // מחפשים את ה-']' הבא אחורה
                    currentEnd = cleanText.lastIndexOf(']', currentEnd - 1);
                }
            }
            throw new Error("כשל בפענוח ה-JSON גם לאחר ניקוי: " + e.message);
        }
      }

      // 3. חילוץ השאלות
      const questions = extractJSON(responseText);

      // 4. החזרת התשובה לאתר
      return { questions };

    } catch (error) {
      logger.error("Gemini Error:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);