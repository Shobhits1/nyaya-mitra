// *
//  * -------------------------------------------------------------------------
//  * FILE: server/index.js
//  * DESCRIPTION: This is the main entry point for the backend server.
//  * It sets up an Express application, connects to the MongoDB database,
//  * configures middleware, and defines the API routes for handling
//  * case submissions and AI judgment generation.
//  * -------------------------------------------------------------------------
//  */

// Import necessary packages
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config(); // Loads environment variables from a .env file into process.env

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Import the Case model we defined
const Case = require("./models/case");

// --- INITIALIZATION ---
const app = express(); // Create an instance of an Express application
const PORT = process.env.PORT || 5000; // Use the port from .env, or 5000 as a default

// Initialize the Google Generative AI client
// Make sure your GEMINI_API_KEY is set in your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- MIDDLEWARE ---
app.use(cors()); // Enable Cross-Origin Resource Sharing to allow frontend to communicate with this server
app.use(express.json()); // Enable the express app to parse JSON formatted request bodies

// --- DATABASE CONNECTION ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Successfully connected to MongoDB Atlas!"))
  .catch((error) => console.error("Error connecting to MongoDB:", error));

// --- API ROUTES ---

/**
 * @route   POST /api/cases
 * @desc    Create a new case and save it to the database
 * @access  Public
 */
app.post("/api/cases", async (req, res) => {
  try {
    // Create a new Case document using the data from the request body
    const newCase = new Case({
      caseTitle: req.body.caseTitle,
      caseDescription: req.body.caseDescription,
      partiesInvolved: req.body.partiesInvolved,
    });

    // Save the new case to the database
    const savedCase = await newCase.save();

    // Send a success response back to the client with the saved data
    res.status(201).json(savedCase);
    console.log("New case submitted:", savedCase.caseTitle);
  } catch (error) {
    console.error("Error creating case:", error);
    res
      .status(500)
      .json({ message: "Failed to create case.", error: error.message });
  }
});

/**
 * @route   GET /api/cases
 * @desc    Get all cases from the database
 * @access  Public
 */
app.get("/api/cases", async (req, res) => {
  try {
    // Find all cases in the database and sort them by submission date (newest first)
    const cases = await Case.find().sort({ submittedAt: -1 });
    res.status(200).json(cases);
  } catch (error) {
    console.error("Error fetching cases:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch cases.", error: error.message });
  }
});

/**
 * @route   POST /api/cases/:id/generate-judgment
 * @desc    Generate a judgment for a specific case using the Gemini API
 * @access  Public
 */
app.post("/api/cases/:id/generate-judgment", async (req, res) => {
  try {
    const caseId = req.params.id;
    // Find the case in the database by its unique ID
    const caseToJudge = await Case.findById(caseId);

    if (!caseToJudge) {
      return res.status(404).json({ message: "Case not found." });
    }

    // --- PROMPT ENGINEERING ---
    // This is where we create the detailed instructions for the AI model.
    const caseDetails = `Case Title: ${caseToJudge.caseTitle}, Parties: ${caseToJudge.partiesInvolved}, Description: ${caseToJudge.caseDescription}`;
    const prompt = `
      As an AI legal analyst named "Nyaya Mitra," provide a preliminary, non-binding judgment for the following case based on the laws of India. Your analysis must be structured into four distinct sections:
      1.  **Factual Summary:** Briefly summarize the key facts of the case.
      2.  **Key Legal Issues:** Identify the primary legal questions that need to be addressed.
      3.  **Legal Analysis & Precedents:** Analyze the issues based on relevant sections of Indian law (e.g., IPC, CrPC, Contract Act). You may cite fictional case precedents for illustrative purposes.
      4.  **Suggested Conclusion:** Based on the analysis, suggest a logical and fair outcome.

      Begin your entire response with this mandatory disclaimer: "Disclaimer: This is an AI-generated analysis and does not constitute legal advice. It is for academic and illustrative purposes only."

      Case Details:
      ${caseDetails}
    `;

    console.log(`Generating judgment for case: ${caseToJudge.caseTitle}`);

    // Send the prompt to the Gemini API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiJudgment = response.text();

    // Update the case in the database with the new judgment and status
    caseToJudge.judgment = aiJudgment;
    caseToJudge.status = "Analysis Complete";
    const updatedCase = await caseToJudge.save();

    console.log(
      `Judgment generated successfully for case: ${updatedCase.caseTitle}`
    );
    // Send the updated case data back to the client
    res.status(200).json(updatedCase);
  } catch (error) {
    console.error("Error generating judgment:", error);
    // If there's an error, update the case status to 'Error'
    await Case.findByIdAndUpdate(req.params.id, { status: "Error" });
    res
      .status(500)
      .json({ message: "Failed to generate judgment.", error: error.message });
  }
});

// --- START SERVER ---
app.listen(PORT, () => {
  console.log(`Nyaya Mitra server is running on http://localhost:${PORT}`);
});
