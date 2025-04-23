const express = require("express") 
const cors = require('cors');
const app = express();
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
require('dotenv').config();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const streamifier = require('streamifier');


app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI("AIzaSyBBCO6gIeUcu0xFAirEjTbbg45znAYI19g");

const courseRoute = require("./Routes/courses")
const authRoute = require("./Routes/auth")
const questionsRoute = require("./Routes/questions")

cloudinary.config({
    cloud_name: "dwxd6ynem",
    api_key: "883323722199575",
    api_secret: "M7UHPbbBSYddrJZ0k58KJdhiRuw",
    secure: true 
});



const storage = multer.memoryStorage();


const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only images and PDF files are allowed.'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 }
});

app.get('/', (req, res) => {
    res.send('Welcome to the Cloudinary Upload API! Use POST /upload to upload files.');
});


const uploadToCloudinary = (fileBuffer, mimetype) => {
    return new Promise((resolve, reject) => {
        // Determine resource type based on mimetype
        let resourceType = 'auto'; // Default to auto
        if (mimetype === 'application/pdf') {
            resourceType = 'raw'; // Explicitly set to 'raw' for PDFs
        } else if (mimetype.startsWith('image/')) {
            resourceType = 'image'; // Explicitly set to 'image' (optional, auto usually works fine for images)
        }
        // Add more conditions here if you support other types like video ('video')

        console.log(`Uploading file with determined resource_type: ${resourceType}`); // Debug log

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: resourceType, // Use the determined resource type
                folder: 'my_uploads'       // Optional: specify a folder in Cloudinary
            },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary Upload Error:', error);
                    reject(new Error(`Upload to Cloudinary failed: ${error.message}`));
                } else {
                    resolve(result);
                }
            }
        );

        streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
};


app.post('/upload', upload.single('file'), (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Pass buffer AND mimetype to the upload function
    uploadToCloudinary(req.file.buffer, req.file.mimetype)
        .then(result => {
            // Check the resource_type in the result (for debugging)
            console.log('Cloudinary Upload Result:', result);

            if (!result || !result.secure_url) {
                 throw new Error('Cloudinary upload succeeded but returned no URL.');
            }

            const resultUrl = result.resource_type == "raw" ? result.secure_url  :  result.secure_url
            res.status(200).json({
                message: 'File uploaded successfully!',
                url: resultUrl 
            });
        })
        .catch(error => {
            // Pass error to the error handling middleware
            next(error);
        });
});



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




