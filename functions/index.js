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
    console.log("🚀🚀🚀 השרת המעודכן (Multiple Choice + Cloze + Open Ended) רץ עכשיו! 🚀🚀🚀");
    
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
        
        CRITICAL CLEANING RULE: 
        - REMOVE all question numbers and prefixes from the question "text" (e.g., completely delete "שאלה 1", "שאלה מספר 5:", "1."). 
        - REMOVE all option markers and bullets from the "options" strings (e.g., completely delete "א.", "ב.", "ג.", "1.", "a)"). Return ONLY the clean text of the option.

        CRITICAL FOR correctIndex:
        - If there is ONE correct answer, the first option is ALWAYS the correct one. Set "correctIndex": 0.
        - If MULTIPLE answers are correct (e.g. "Select all that apply"), put ALL correct options at the beginning of the "options" array, and set "correctIndex" as an array of integers (e.g. [0, 1, 2]).
        - If the question is an OPEN ESSAY question with no options, set "type": "open_ended", "options": [], and "correctIndex": null.
        
        CRITICAL FOR IMAGES: Set "imageNeeded": true ONLY IF text explicitly refers to a missing diagram/graph.
        CRITICAL JSON FORMATTING (DO NOT FAIL THIS):
        1. YOU MUST RETURN ONLY A VALID JSON ARRAY.
        2. NEVER use unescaped double quotes inside text fields. If a question or option contains quotes, you MUST escape them with a backslash (e.g. "המושג \\"דלקת\\" אומר").
        3. Do NOT wrap the response in markdown blocks (\`\`\`json).
      
        Return ONLY raw JSON array: [{"id": 1, "text": "Q", "options": ["Correct", "W1", "W2"], "correctIndex": 0, "imageNeeded": false}]`;
      } else {
        // --- מצב ממוחשב (Moodle) - תומך ב-3 סוגים ---
        prompt = `You are parsing a "Review" PDF of a solved Moodle exam.
        Extract questions into a JSON array. 
        
        CRITICAL CLEANING RULE: 
        - REMOVE all question numbers and prefixes from the question "text" (e.g., completely delete "שאלה 1", "שאלה מספר 5:", "1."). 
        - REMOVE all option markers and bullets from the "options" strings (e.g., completely delete "א.", "ב.", "ג.", "1.", "a)"). Return ONLY the clean text of the option.

        The exam contains THREE main types of logical questions. Use your intelligence to detect the type:

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

        TYPE 3: Open-Ended / Free Text / Essay
        - DETECT IF: The question explicitly requires the student to type a free-text response and there are absolutely NO options to choose from.
        - Output format: {"type": "open_ended", "text": "Explain the process of...", "options": [], "correctIndex": null, "imageNeeded": false}

        CRITICAL DIFFERENTIATION RULES:
        1. DO NOT confuse Type 1 with Type 2! If there is a simple list of checkboxes and the question asks to "mark all correct statements" (e.g. "סמנו את כל המשפטים הנכונים"), it is ABSOLUTELY TYPE 1. Just use an array for correctIndex!
        2. Type 2 is STRICTLY for fill-in-the-blanks, drop-down menus inside text, or matching columns.
        3. Type 3 is ONLY for questions with no options at all (the student has to write from scratch).
        4. If a question refers to an image (X-ray, Graph, Diagram) -> Set "imageNeeded": true.

        CRITICAL JSON FORMATTING (DO NOT FAIL THIS):
        1. YOU MUST RETURN ONLY A VALID JSON ARRAY.
        2. NEVER use unescaped double quotes inside text fields. If a question or option contains quotes, you MUST escape them with a backslash (e.g. "המושג \\"דלקת\\" אומר").
        3. Do NOT wrap the response in markdown blocks (\`\`\`json).
        
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
          
          // אבטחת סוגי שאלות במקרה של הזיות
          if (q.type !== 'multiple_choice' && q.type !== 'cloze' && q.type !== 'open_ended') {
              q.type = 'multiple_choice';
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

// הוסף את הקוד הזה בתחתית הקובץ index.js הקיים שלך

exports.generateExplanationWithGemini = onCall(
  {
    cors: true,
    timeoutSeconds: 60, // הסבר לוקח פחות זמן מפענוח מבחן שלם
    memory: "512MiB",
    secrets: [apiKey],
  },
  async (request) => {
    // 1. אבטחה: וידוא שהמשתמש מחובר
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "רק משתמש מחובר רשאי לקבל הסברים.");
    }

    // 2. קליטת הנתונים מהלקוח
    const { questionText, options, correctAnswers } = request.data;
    
    if (!questionText) {
      throw new HttpsError("invalid-argument", "חסר טקסט השאלה ליצירת הסבר.");
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey.value());
      // אפשר להשתמש במודל המהיר flash להסברים
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      // 3. בניית הפרומפט להסבר - גרסה נקייה ללא טבלאות
      const prompt = `
You are an expert physician and senior medical lecturer. Your task is to explain the solution to the following medical board exam question for clinical medical students.

Critical Instructions for the Response Structure:
1. Focused Opening: Explain clearly and concisely (1-2 paragraphs) why the correct answer is correct. Use **bold text** for key terms and diagnoses.
2. Differential Diagnosis (DDx): DO NOT USE TABLES. Instead, use a clear bulleted list to review the options. For each option, write its name in **bold**, followed by a clear explanation of why it is correct or incorrect. Add a clear line break between each option to ensure high readability.
3. Clinical Pearls & Mnemonics: Always add a prominent section at the end with classic medical mnemonics related to the disease/topic to aid in memorization (e.g., CRAB for Multiple Myeloma, AEIOU for dialysis).
4. Formatting Restrictions: The entire response MUST be written in professional Hebrew (you may keep known medical abbreviations in English). Use basic Markdown (**bold** and - bullets) ONLY. 
DO NOT use LaTeX, math blocks, or dollar signs ($). Use standard plain text for numbers and formulas (e.g., write pH < 7.1 instead of $\text{pH} < 7.1$).
Be direct, educational, and easy to read. Use formatting (like bolding) if necessary.

Question:
${questionText}

Options:
${JSON.stringify(options || [])}

Correct Answers:
${JSON.stringify(correctAnswers || [])}
      `;

      // 4. הפעלת המודל
      const result = await model.generateContent(prompt);
      const explanation = result.response.text();

      // 5. החזרת ההסבר ללקוח
      return { explanation };

    } catch (error) {
      logger.error("Gemini Explanation Error:", error);
      throw new HttpsError("internal", "אירעה שגיאה ביצירת ההסבר. נסה שוב.");
    }
  }
);

const nodemailer = require("nodemailer");

// הגדרת סודות חדשים עבור פרטי האימייל שלך
const gmailEmail = defineSecret("GMAIL_EMAIL");
const gmailPassword = defineSecret("GMAIL_APP_PASSWORD");

exports.sendReportResolvedEmail = onCall(
  {
    cors: true,
    secrets: [gmailEmail, gmailPassword],
  },
  async (request) => {
    // אבטחה: וידוא שרק משתמש מחובר יכול להפעיל את הפונקציה (עורכים/מנהלים)
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "רק מנהלים יכולים לשלוח עדכונים.");
    }
const { email, name, questionText, reportText, examTitle, adminMessage, status } = request.data;

    if (!email) {
      return { success: false, message: "לא סופקה כתובת אימייל" };
    }

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailEmail.value(),
          pass: gmailPassword.value(),
        },
      });

      // בניית הודעת הסטטוס לפי הבחירה שלך
      let statusHtml = "";
      if (status === "accepted") {
        statusHtml = `
          <div style="background-color: #e8f5e9; padding: 15px; border-right: 4px solid #4caf50; margin: 15px 0;">
            <strong>עדכון משמח:</strong><br/>
            <p style="margin-top: 8px; font-size: 15px;">הדיווח שלך התקבל! הטעות אומתה, והשאלה תוקנה במערכת. תודה רבה על העזרה בשיפור המאגר.</p>
          </div>
        `;
      } else {
        statusHtml = `
          <div style="background-color: #fff3e0; padding: 15px; border-right: 4px solid #ff9800; margin: 15px 0;">
            <strong>עדכון לגבי הדיווח:</strong><br/>
            <p style="margin-top: 8px; font-size: 15px;">הדיווח שלך נבדק לעומק על ידי הצוות המקצועי, אך הוחלט להשאיר את השאלה כפי שהיא.</p>
            <p style="margin-top: 8px; font-size: 14px;"><strong>סיבת הדחייה:</strong> ${adminMessage}</p>
          </div>
        `;
      }

      const mailOptions = {
        from: `"צוות האתר" <${gmailEmail.value()}>`,
        to: email,
        subject: status === "accepted" ? "הדיווח שלך טופל ותוקן! ✅" : "עדכון לגבי הדיווח שפתחת ℹ️",
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
            <h2 style="color: #2e6c80;">שלום ${name || 'סטודנט/ית יקר/ה'},</h2>
            <p>רצינו לעדכן אותך שהדיווח שפתחת לגבי השאלה במבחן <strong>${examTitle}</strong> טופל.</p>
            
            ${statusHtml}
            
            <div style="background-color: #f9f9f9; padding: 15px; border-right: 4px solid #9e9e9e; margin: 15px 0;">
              <strong>תוכן הדיווח שלך:</strong><br/>
              <i>"${reportText}"</i>
            </div>
            
            <div style="background-color: #f4f8fa; padding: 15px; border-right: 4px solid #2196f3; margin: 15px 0;">
              <strong>טקסט השאלה:</strong><br/>
              <i>"${questionText}"</i>
            </div>

            <p>בהצלחה בלימודים,<br/>צוות האתר.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${email}`);
      return { success: true };

    } catch (error) {
      logger.error("Error sending email:", error);
      throw new HttpsError("internal", "שגיאה בשליחת האימייל: " + error.message);
    }
  }
);