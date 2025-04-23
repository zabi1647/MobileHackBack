const express = require("express") 
const cors = require('cors');
const app = express();
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
require('dotenv').config();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI("AIzaSyBBCO6gIeUcu0xFAirEjTbbg45znAYI19g");

const courseRoute = require("./Routes/courses")
const authRoute = require("./Routes/auth")
const questionsRoute = require("./Routes/questions")



app.get('/',  (req, res) => {
  res.json({
    message: 'Welcome boys'});
});

app.post('/summarize', async (req, res) => {
    try {
      const textToSummarize = req.body.textToSummarize;
  
      if (!textToSummarize || typeof textToSummarize !== 'string' || textToSummarize.trim() === '') {
        return res.status(400).json({
          error: 'Missing or empty "textToSummarize" field in request body.'
        });
      }
  
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
      const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ];
  
      const prompt = `Please provide a concise summary of the following text:\n\n---\n${textToSummarize}\n---\n\nSummary:`;
  
      const result = await model.generateContent(prompt, safetySettings);
      const response = result.response;
  
      if (!response || !response.candidates || !response.candidates[0] || !response.candidates[0].content || !response.candidates[0].content.parts || !response.candidates[0].content.parts[0]) {
         if (response && response.promptFeedback && response.promptFeedback.blockReason) {
           throw new Error(`Request blocked due to ${response.promptFeedback.blockReason}`);
         }
         throw new Error("Invalid or empty response structure from Gemini API after successful call.");
       }
      const summaryText = response.candidates[0].content.parts[0].text.trim();
  
      res.json({
        summary: summaryText,
        source: 'Google Gemini API'
      });
  
    } catch (error) {
       let isSafetyBlock = false;
       if (error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason){
           isSafetyBlock = true;
       } else if (error.message && error.message.startsWith('Request blocked due to')){
           isSafetyBlock = true;
       }
  
       if (isSafetyBlock) {
          const blockReason = error.response?.promptFeedback?.blockReason || error.message.substring('Request blocked due to '.length);
          const details = error.response?.promptFeedback?.safetyRatings || 'No details provided';
          res.status(400).json({
            message: `Request blocked for safety reasons: ${blockReason}`,
            details: details
          });
       }
       else {
         res.status(500).json({
           message: 'Error generating summary via Google Gemini API',
           error: error.message
         });
       }
     }
   });


  app.use("/api", authRoute)
  app.use("/api", courseRoute)
  app.use("/api", questionsRoute)



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server runniing on port ${PORT}`);
});




