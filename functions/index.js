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
    console.log("🚀🚀🚀 השרת המעודכן רץ עכשיו! 🚀🚀🚀");
    
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
        CRITICAL FOR correctIndex:
        - If there is ONE correct answer, the first option is ALWAYS the correct one. Set "correctIndex": 0.
        - If MULTIPLE answers are correct (e.g. "Select all that apply"), put ALL correct options at the beginning of the "options" array, and set "correctIndex" as an array of integers (e.g. [0, 1, 2]).
        
        CRITICAL FOR IMAGES: Set "imageNeeded": true ONLY IF text explicitly refers to a missing diagram/graph.
        Return ONLY raw JSON array: [{"id": 1, "text": "Q", "options": ["Correct", "W1", "W2"], "correctIndex": 0, "imageNeeded": false}]`;
      } else {
        // --- מצב ממוחשב (Moodle) - הפרומפט החדש והמדויק ---
        prompt = `You are parsing a "Review" PDF of a solved Moodle exam.
        Extract questions into a JSON array. 
        
        The exam contains two main types of logical questions. Use your intelligence to detect the type:

        TYPE 1: Single OR Multiple Choice (Radio Buttons / Checkboxes)
        - DETECT IF: There is ONE main question sentence, followed by a list of options. The user selects one OR MORE options.
        - The correct answer(s) are usually marked with a checkmark (✓/☑), green color, or summarized at the bottom like "התשובות הנכונות הן".
        - Output format: {"type": "multiple_choice", "text": "Question?", "options": ["Opt1", "Opt2", "Opt3"], "correctIndex": [0, 2], "imageNeeded": false}
        - CRITICAL RULE FOR correctIndex:
          * If there is exactly ONE correct answer, correctIndex MUST be an integer (e.g., 1).
          * If there are MULTIPLE correct answers (e.g., checkboxes, or multiple statements are correct), correctIndex MUST be an ARRAY of integers representing the indices of ALL correct options (e.g., [0, 2]).

        TYPE 2: Complex / Multi-Part / Matching / Cloze
        - DETECT IF: The question asks to match items to each other, fill in missing words inside a paragraph, or classify items in a table.
        - EXAMPLES: 
          * "Match item A to X, item B to Y..."
          * "Complete the sentence: The heart is {{0}} and the liver is {{1}}..."
        
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

        CRITICAL DIFFERENTIATION RULES:
        1. DO NOT confuse Type 1 with Type 2! If there is a simple list of checkboxes and the question asks to "mark all correct statements" (e.g. "סמנו את כל המשפטים הנכונים"), it is ABSOLUTELY TYPE 1. Just use an array for correctIndex!
        2. Type 2 is STRICTLY for fill-in-the-blanks, drop-down menus inside text, or matching columns.
        3. If a question refers to an image (X-ray, Graph, Diagram) -> Set "imageNeeded": true.

        Return ONLY the raw JSON array.`;
      }
      

      // 1. קבלת התשובה הגולמית מ-Gemini
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: fileBase64, mimeType: "application/pdf" } },
      ]);

      const responseText = result.response.text();
      
      // 2. פונקציית עזר לניקוי חכם של JSON
      function extractJSON(text) {
        let cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        const firstBracket = cleanText.indexOf('[');
        const lastBracket = cleanText.lastIndexOf(']');
        
        if (firstBracket === -1 || lastBracket === -1) {
             throw new Error("לא נמצא מבנה של מערך JSON בתשובה.");
        }

        const candidate = cleanText.substring(firstBracket, lastBracket + 1);
        
        try {
            return JSON.parse(candidate);
        } catch (e) {
            let currentEnd = lastBracket;
            while (currentEnd > firstBracket) {
                try {
                    const subCandidate = cleanText.substring(firstBracket, currentEnd + 1);
                    return JSON.parse(subCandidate);
                } catch (e2) {
                    currentEnd = cleanText.lastIndexOf(']', currentEnd - 1);
                }
            }
            throw new Error("כשל בפענוח ה-JSON גם לאחר ניקוי: " + e.message);
        }
      }

      // 3. חילוץ השאלות
      const rawQuestions = extractJSON(responseText);

      // 4. התיקון הקריטי: נרמול הנתונים לפני השליחה לאתר
      const questions = rawQuestions.map(q => {
          if (q.question && !q.text) {
              q.text = q.question;
              delete q.question;
          }
          return q;
      });

      // 5. החזרת התשובה לאתר
      return { questions };

    } catch (error) {
      logger.error("Gemini Error:", error);
      throw new HttpsError("internal", error.message);
    }
  }
);