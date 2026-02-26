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
        prompt = `Extract exam questions into a raw JSON array.
        
        RULES FOR STANDARD EXAM (Form 0):
        1. **Single Correct**: The first option is ALWAYS the correct one (index 0).
        2. **Output**: "correctIndex" MUST be a single INTEGER (0).
        3. **Type**: Always "multiple_choice".
        
        Return ONLY raw JSON.`;

      } else {
        // --- מצב ממוחשב (Moodle) - התיקון נגד פיצול שאלות ---
        prompt = `You are parsing a "Review" PDF of a solved Moodle exam.
        Extract questions into a JSON array.

        *** CRITICAL INSTRUCTION: GROUPING ***
        Do NOT split a single "Select all that apply" question into multiple "True/False" questions.
        If you see a main question text followed by a list of statements/options -> Treat it as **ONE** question with multiple options.

        ---------------------------------------------------
        DECISION TREE (Follow in order):

        1. **CLOZE** (Fill-in-the-blank / Matching):
           - Only if there are explicit gaps "____" or matching pairs (A->1).
           - Output: "type": "cloze".

        2. **MULTI-SELECT** (Checkboxes / "Select all"):
           - Signs: Square brackets [], specific instruction to "Select all correct sentences".
           - **ACTION**: create ONE question object.
           - "options": List all the sentences as strings.
           - "correctIndex": An ARRAY of integers for the correct sentences (e.g., [0, 2, 3]).
           - **NOTE**: Ignore individual feedback lines like "Statement A is correct". Just use them to determine if index 0 is correct.

        3. **SINGLE-SELECT** (Radio Buttons):
           - Signs: Round brackets (), only one correct answer.
           - "correctIndex": A single INTEGER (e.g., 1).

        ---------------------------------------------------
        HOW TO FIND CORRECT ANSWERS IN MOODLE:
        - Look for the SUMMARY LINE at the bottom: "The correct answers are: A, C" (התשובות הנכונות הן: ...).
        - OR look for checkmarks (V) / green highlights next to options.
        ---------------------------------------------------

        JSON OUTPUT RULES:
        - Keep Hebrew text exactly as is.
        - Remove prefixes ("a.", "1.") from options.
        - If image exists -> "imageNeeded": true.

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